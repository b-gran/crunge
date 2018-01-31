const child_process = require('child_process')
const path = require('path')
const fs = require('fs')

const Promise = require('bluebird')
const ffmpeg = require('fluent-ffmpeg')
const chalk = require('chalk')
const R = require('ramda')
const Jimp = require('jimp')
const rimraf = require('rimraf')

Promise.promisifyAll(fs)

const BASE_KERNEL = [
  [1, 2, -1, 1],
  [-1, -2, 1, -1],
  [2, 1, 0, -1],
  [1, 1, -1, -1],
]

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

getFrames(process.argv[2])
  .then(R.take(24 * 5))
  .then(frames => applyEffectsToFrames(
    [bmp => bmp.convolute(BASE_KERNEL)],
    'KnivesResult2'
  )(frames))

  .then(() => console.log('done') || process.exit(0))
  .catch(err => console.log(err) || process.exit(1))

