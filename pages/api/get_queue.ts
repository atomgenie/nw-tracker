import axios from "axios"
import {NextApiHandler} from "next"
import randomstring from "randomstring"

interface API_ERROR {
  type: "API_ERROR"
  kind: string
}

let apiToken: string | undefined

function getToken() {
  if (apiToken !== undefined) {
    return apiToken
  }

  apiToken = process.env.NEW_WORLD_TOKEN

  if (apiToken === undefined) {
    throw new Error("Token invalid")
  }

  return apiToken
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
  console.log("Called")
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
    }>(`https://firstlight.newworldstatus.com/ext/v1/worlds/asgard`, {
      headers: {
        authorization: `Bearer ${getToken()}`,
      },
    })

    return data.message.queue_current
  } catch {
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
