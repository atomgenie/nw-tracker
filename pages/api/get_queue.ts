import {NextApiHandler} from "next"
import chromium from "chrome-aws-lambda"
import playwrightCore from "playwright-core"
import playwrightFull from "playwright"

const API_ERROR = "API_ERROR"

async function waitAsync(ms: number) {
  return new Promise(res => {
    setTimeout(res, ms)
  })
}

export const getQueue = async (): Promise<number | typeof API_ERROR> => {
  let browser

  if (process.env.NODE_ENV !== "development") {
    browser = await playwrightCore.chromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    })
  } else {
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
