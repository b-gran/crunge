const R = require('ramda')
const chalk = require('chalk')

const toFixedLengthString = R.curry((length, n) => {
  const string = String(n)
  return string.length < length
    ? `${R.repeat('0', length - string.length)}${string}`
    : string
})
module.exports.toFixedLengthString = toFixedLengthString

function timeFormat (date) {
  return (
    `[${[date.getHours(), date.getMinutes(), date.getSeconds()]
      .map(toFixedLengthString(2))
      .join(':')}]`
  )
}
module.exports.timeFormat = timeFormat

function debug (...msg) {
  console.log(chalk.blue(timeFormat(new Date)), ...msg)
}
debug.color = color => (...msg) => console.log(color(timeFormat(new Date)), ...R.map(color, msg))
debug.warn = debug.color(chalk.yellow)
debug.error = debug.color(chalk.red)

module.exports.debug = debug
