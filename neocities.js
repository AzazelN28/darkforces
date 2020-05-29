const glob = require('glob')
const dotenv = require('dotenv')
const neocities = require('neocities')
const { program } = require('commander')

dotenv.config()

program
  .option('-d, --dry-run', 'Do not upload any data')
  .option('-v, --verbose', 'Shows more info')
  .parse(process.argv)

glob('dist/**/*', { nodir: true }, function (err, files) {
  if (err) {
    console.error(err)
    return process.exit(1)
  }

  const uploads = files
    .filter((file) => !/^dist\/(data|Tone_000|Drum_000)/.test(file))
    .map((file) => ({
      name: `${process.env.NEOCITIES_PATH}${file.replace(/^dist/, '')}`,
      path: `./${file}`
    }))

  if (program.dryRun || program.verbose) {
    uploads.map(file => console.log(`${file.path} -> ${file.name}`))
  }

  console.log('Uploading, this will take a while...')
  if (!program.dryRun) {
    const api = new neocities(
      process.env.NEOCITIES_USERNAME,
      process.env.NEOCITIES_PASSWORD
    )
    api.upload(uploads, function (response) {
      console.log(response.message)
      process.exit((response.result === 'success') ? 0 : 1)
    })
  }

})
