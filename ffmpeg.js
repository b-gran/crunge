const child_process = require('child_process')
const path = require('path')
const fs = require('fs')

const ffmpeg = require('fluent-ffmpeg')
const chalk = require('chalk')
const R = require('ramda')

const { debug } = require('./lib')

function toFrames (videoPath) {
  const absolutePath = path.resolve(videoPath)
  const frameDirectory = getFrameDirectory(absolutePath)

  debug(`Corrupting video: ${chalk.black(absolutePath)}`)
  debug(`Using frame directory: ${chalk.black(frameDirectory)}`)

  try {
    fs.mkdirSync(frameDirectory)
  } catch (err) {
    debug.warn('Frame directory already exists.')
    return Promise.resolve(frameDirectory)
  }

  return new Promise((resolve, reject) => {
    return ffmpeg(absolutePath)
      .on('end', () => resolve(getFrameDirectory(absolutePath)))
      .on('error', err => {
        debug.error('Unable to decode video.')
        return reject(new Error(err))
      })
      .save(getFrameFormatString(absolutePath))
  })
}

// Test code
toFrames(process.argv[2])
  .then(() => console.log('done!') || process.exit(0))
  .catch(err => console.error('error') || console.log(err) || process.exit(1))

function getFrameFormatString (videoPath) {
  const parsedPath = path.parse(videoPath)
  return `${parsedPath.dir}/${parsedPath.name}__frames/frame%05d.bmp`
}

function getFrameDirectory (videoPath) {
  const parsedPath = path.parse(videoPath)
  return `${parsedPath.dir}/${parsedPath.name}__frames/`
}
