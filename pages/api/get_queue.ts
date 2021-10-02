import {NextApiHandler} from "next"
import type PlaywrightFullType from "playwright"
import type PlaywrightCoreType from "playwright-aws-lambda"

const API_ERROR = "API_ERROR"

async function waitAsync(ms: number) {
  return new Promise(res => {
    setTimeout(res, ms)
  })
}

let playwrightCorePromise: Promise<typeof PlaywrightCoreType> | undefined
let playwrightFullPromise: Promise<typeof PlaywrightFullType> | undefined

if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
  playwrightCorePromise = import("playwright-aws-lambda")
} else {
  playwrightFullPromise = import("playwright")
}

export const getQueue = async (): Promise<number | typeof API_ERROR> => {
  let browser

  if (process.env.AWS_LAMBDA_FUNCTION_NAME && playwrightCorePromise) {
    const playwrightCore = await playwrightCorePromise

    browser = await playwrightCore.launchChromium()
  } else if (playwrightFullPromise) {
    const playwrightFull = await playwrightFullPromise
    browser = await playwrightFull.chromium.launch({
      headless: true,
    })
  } else {
    return -1
  }

  const page = await browser.newPage()
  await page.goto("https://newworldstatus.com/")
  await waitAsync(6000)

  const position = await page.evaluate(() => {
    const nodesAsgard = Array.from(document.querySelectorAll("strong")).filter(
      node => node.textContent === "Asgard",
    )

    const [nodeAsgard] = nodesAsgard

    if (!nodeAsgard) {
      return "API_ERROR"
    }

    const line = nodeAsgard.parentElement?.parentElement

    if (!line) {
      return "API_ERROR"
    }

    const timerElement = line.querySelector("td:nth-child(6)")

    if (!timerElement || !timerElement.textContent) {
      return "API_ERROR"
    }

    return Number.parseInt(timerElement.textContent)
  })

  return position
}

const handler: NextApiHandler = async (req, res) => {
  const position = await getQueue()

  if (position === API_ERROR) {
    return res.status(404).send("")
  }

  res.json(position)
}

export default handler
