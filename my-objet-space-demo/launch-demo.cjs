const http = require('node:http')
const { spawn } = require('node:child_process')
const path = require('node:path')

const url = 'http://127.0.0.1:5176/'
const project = __dirname

function serverStatus() {
  return new Promise((resolve) => {
    const request = http.get(url, { timeout: 2000 }, (response) => {
      let html = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => { html += chunk })
      response.on('end', () => resolve(html.includes('<title>My Objet Space</title>') && html.includes('/src/main.jsx') ? 'ready' : 'other'))
    })
    request.on('timeout', () => request.destroy())
    request.on('error', () => resolve('offline'))
  })
}

async function main() {
  let status = await serverStatus()
  if (status === 'other') throw new Error('Port 5176 is already being used by another application.')
  if (status === 'offline') {
    const server = spawn(process.execPath, [path.join(project, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '127.0.0.1', '--port', '5176', '--strictPort'], { cwd: project, detached: true, stdio: 'ignore', windowsHide: true })
    server.unref()
    for (let attempt = 0; attempt < 30 && status === 'offline'; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      status = await serverStatus()
    }
  }
  if (status !== 'ready') throw new Error('Unable to start the demo server. Run npm install in the project folder and try again.')
  const browser = spawn('explorer.exe', [url], { detached: true, stdio: 'ignore', windowsHide: true })
  browser.unref()
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
