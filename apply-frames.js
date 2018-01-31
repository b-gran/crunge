const child_process = require('child_process')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const Promise = require('bluebird')
const ffmpeg = require('fluent-ffmpeg')
const chalk = require('chalk')
const R = require('ramda')
const Jimp = require('jimp')
const rimraf = require('rimraf')

const { debug } = require('./lib')

Promise.promisifyAll(crypto)
Promise.promisifyAll(fs)

const BASE_KERNEL = [
  [1, 2, -1, 1],
  [-1, -2, 1, -1],
  [2, 1, 0, -1],
  [1, 1, -1, -1],
]
const KERNEL_ELEMS = R.pipe(R.map(R.length), R.sum)(BASE_KERNEL)

function decodeBmp (bmpPath) {
  const absolutePath = path.resolve(bmpPath)
  return Jimp.read(absolutePath)
    .then(bmp => {
      return new Promise((resolve, reject) =>
        bmp.convolute(BASE_KERNEL)
          .write('test2.bmp', err => err ? reject(err) : resolve())
      )
    })

    .then(() => console.log('done') || process.exit(0))
    .catch(err => console.log(err) || process.exit(1))
}

// const resultDir = getResultDirectory(process.argv[2])
// decodeBmp(process.argv[2])

function applyEffectsToFrames (effects, resultDirectory) {
  return (frames) => {
    const effectWidth = Math.max(
      Math.floor(frames.length / effects.length),
      1
    )

    const tailFrames = Math.max(
      frames.length - (effectWidth * effects.length),
      0
    )

    const effectsForFrames = R.pipe(
      R.map(effect => R.times(() => effect, effectWidth)),
      fastConcatAll,
      R.flip(R.curry(mutableConcat))(
        R.times(() => R.last(effects), tailFrames)
      )
    )(effects)

    const maxFrameIndex = frames.length - 1

    const absoluteResultDir = path.resolve(resultDirectory)
    try {
      fs.mkdirSync(absoluteResultDir)
    } catch (err) {}

    return Promise.all(
      frames.map(
        // index, filename -- sorted by index
        (frame, idx) => {
          const outputPath = path.resolve(path.join(
            resultDirectory, `frame${toFrameNumber(idx, maxFrameIndex)}.bmp`
          ))

          const effect = effectsForFrames[idx]
          return Jimp.read(frame.filename)
            .then(bmp => {
              return new Promise((resolve, reject) =>
                effect(bmp)
                  .write(outputPath, err => err ? reject(err) : resolve())
              )
            })
            .then(() => ({
              idx,
              filename: outputPath,
            }))
        }
      )
    )
  }
}

function toFrameNumber (frameIndex, maxFrameIndex) {
  const frameIndexLength = String(frameIndex).length
  const maxFrameLength = String(maxFrameIndex).length
  return R.concat(
    R.times(() => '0', maxFrameLength - frameIndexLength).join(''),
    String(frameIndex)
  )
}

function fastConcatAll (lists) {
  const concat = []
  for (const l of lists) {
    for (const el of l) {
      concat.push(el)
    }
  }
  return concat
}

// Mutates src
function mutableConcat (src, dest) {
  dest.forEach(el => src.push(el))
  return src
}

const RE_FRAME = /^(?:.*[^\d])?(\d+)\.bmp$/

function getFrames (frameDirectory) {
  return fs.readdirAsync(frameDirectory)
    .then(R.pipe(
      R.map(R.match(RE_FRAME)),
      R.filter(R.complement(R.isEmpty)),
      R.map(match => {
        const relativeFilename = match[0]
        const absolutePath = path.resolve(
          path.join(frameDirectory, relativeFilename)
        )
        const index = Number(match[1])
        return {
          index,
          filename: absolutePath,
        }
      }),
      R.sortBy(R.prop('index'))
    ))
}

function getResultDirectory (frameDirectory) {
  const parsedPath = path.parse(frameDirectory)
  return `${parsedPath.dir}/${parsedPath.name}__result/`
}

const RE_FRAME_BASE_INDEX = /^(.*[^\d])?(\d+)\.bmp$/

async function encodeFrames (frames, frameDirectory) {
  const { dir: inputDir, name: inputName } = path.parse(frameDirectory)
  const encodedVideoName = `${path.resolve(path.join(inputDir, inputName))}.mp4`

  debug(`Writing encoded video to ${encodedVideoName}`)

  const frameFormatString = getFrameFormatString(frames)
  const absoluteFormatString = path.resolve(path.join(frameDirectory, frameFormatString))

  return new Promise((resolve, reject) => {
    ffmpeg(absoluteFormatString)
      .fps(24)
      // .format('image2')
      .videoCodec('libx264')

      .on('end', () => resolve(encodedVideoName))
      .on('error', err => {
        debug.error('Unable to encode video.')
        return reject(new Error(err))
      })

      .save(encodedVideoName)
  })
}

function getFrameFormatString (frames) {
  if (frames.length === 0) {
    return Promise.reject(new Error('You must specify at least one frame.'))
  }

  // Decompose the frame file path into the frame base name and frame index
  const absolutePath = frames[0].filename
  const filename = path.parse(absolutePath).base
  const match = RE_FRAME_BASE_INDEX.exec(filename)

  const frameBaseName = match[1]
  const frameIndex = match[2]
  const frameIndexLength = frameIndex.length

  // The format string is the base name followed by the number of characters in the frame index
  // and finally the format string suffix.
  return `${frameBaseName}%0${frameIndexLength}d.bmp`
}

// ffmpeg -r 24 -f image2 -i KnivesResult30c6643b/frame%03d.bmp -vcodec libx264 -crf 25  -pix_fmt yuv420p test3.mp4

async function run () {
  const buf = await crypto.randomBytesAsync(4)
  const resultFolder = path.resolve(`KnivesResult${buf.toString('hex')}`)

  try {
    fs.mkdirSync(resultFolder)
  } catch (err) {
    if (err) {
      debug.warn('Result folder already exists.')
    }
  }

  debug(`Using result folder ${chalk.green(resultFolder)}`)

  const FRAMES_PER_SECOND = 24
  const SECONDS_OF_VIDEO = 5

  const allFrames = await getFrames(process.argv[2])
  const frames = R.take(FRAMES_PER_SECOND * SECONDS_OF_VIDEO)(allFrames)

  const outputFrames = await applyEffectsToFrames(
    [(() => {
      const JITTER = 3
      let idx = 0
      return bmp => {
        const kernel = R.clone(BASE_KERNEL)
        const positionInKernel = idx % KERNEL_ELEMS

        const row = Math.floor(positionInKernel / kernel.length)
        const col = positionInKernel % kernel[row].length

        kernel[row][col] += JITTER
        idx += 1

        return bmp.convolute(kernel)
      }
    })()],
    resultFolder
  )(frames)

  await encodeFrames(outputFrames, resultFolder)

  debug('Finished corrupting video')
}


run()
  .then(() => debug('Processing complete') || process.exit(0))
  .catch(err => console.log(err) || process.exit(1))
