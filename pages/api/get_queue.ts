import axios from "axios"
import {NextApiHandler} from "next"
import randomstring from "randomstring"

interface API_ERROR {
  type: "API_ERROR"
  kind: string
}

let envMap: Partial<Record<string, string>> = {}

function getEnv(env: string): string {
  let envValue = envMap[env]

  if (envValue !== undefined) {
    return envValue
  }

  envValue = process.env[env]

  if (envValue === undefined) {
    throw new Error(`Error: Env ${env} is undefined.`)
  }

  envMap[env] = envValue
  return envValue
}

function memoizeCallApi<T extends any>(apiMethod: () => Promise<T>, timeout: number) {
  let lastCall: number | null
  let promiseData: Promise<T> | null

  return () => {
    const timestamp = Date.now()

    if (lastCall !== null && lastCall + timeout >= timestamp && promiseData !== null) {
      return promiseData
    }

    lastCall = timestamp
    promiseData = apiMethod()
    return promiseData
  }
}

export const getQueue = async (): Promise<number | API_ERROR> => {
  const newWorldToken = getEnv("NEW_WORLD_TOKEN")
  const newWorldApiUrl = getEnv("NEW_WORLD_API")

  try {
    const {data} = await axios.get<{
      success: true
      via: string
      message: {
        players_current: number
        players_maximum: number
        queue_current: number
        queue_wait_time_minutes: number
        status_enum: string
      }
    }>(`${newWorldApiUrl}/ext/v1/worlds/asgard`, {
      headers: {
        Authorization: `Bearer ${newWorldToken}`,
      },
    })

    return data.message.queue_current
  } catch (err) {
    console.error(err)
    return {
      type: "API_ERROR",
      kind: "Error while making request",
    }
  }
}

const memoizedGetQueue = memoizeCallApi(getQueue, 120 * 1000)

const handler: NextApiHandler = async (req, res) => {
  const requiredId = randomstring.generate(8)

  console.log(`[GET] ${requiredId}`)
  const position = await memoizedGetQueue()

  if (typeof position !== "number") {
    console.log(`[END] ${requiredId} - ${position.type}: ${position.kind}`)
    return res.status(404).send("")
  }

  console.log(`[END] ${requiredId} - ${position}`)

  return res.send(position)
}

export default handler
