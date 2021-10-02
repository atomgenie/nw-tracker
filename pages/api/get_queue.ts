import {NextApiHandler} from "next"
import chromium from "chrome-aws-lambda"
import type PlaywrightCoreType from "playwright-core"
import type PlaywrightFullType from "playwright"

const API_ERROR = "API_ERROR"

async function waitAsync(ms: number) {
  return new Promise(res => {
    setTimeout(res, ms)
  })
}

let playwrightCore: typeof PlaywrightCoreType | undefined
let playwrightFull: typeof PlaywrightFullType | undefined

export const getQueue = async (): Promise<number | typeof API_ERROR> => {
  let browser

  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    playwrightCore = playwrightCore ?? (await import("playwright-core"))

    browser = await playwrightCore.chromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    })
  } else {
    playwrightFull = playwrightFull ?? (await import("playwright"))
    browser = await playwrightFull.chromium.launch({
      headless: true,
    })
  }

  const page = await browser.newPage()
  await page.goto("https://newworldstatus.com/")
  await waitAsync(8000)

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
