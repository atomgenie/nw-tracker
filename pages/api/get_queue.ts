import {NextApiHandler} from "next"
import chrome from "chrome-aws-lambda"
import puppeteerCore from "puppeteer-core"
import puppeteerFull, {Browser} from "puppeteer"

const API_ERROR = "API_ERROR"

async function waitAsync(ms: number) {
  return new Promise(res => {
    setTimeout(res, ms)
  })
}

let puppeteer: any
let isLambda = false

if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  // running on the Vercel platform.
  puppeteer = puppeteerCore
  isLambda = true
} else {
  // running locally.
  puppeteer = puppeteerFull
}

export const getQueue = async (): Promise<number | typeof API_ERROR> => {
  const browser: Browser = await puppeteer.launch(
    isLambda
      ? {
          args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
          defaultViewport: chrome.defaultViewport,
          executablePath: await chrome.executablePath,
          headless: true,
          ignoreHTTPSErrors: true,
        }
      : undefined,
  )

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
