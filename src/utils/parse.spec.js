import { parseLine } from './parse'

describe('Parse', () => {
  it('should parse a version line', () => {
    const [version] = parseLine('MSG {v}', 'MSG 1.0')
    expect(version).to.be.equal('1.0')
  })

  it('should parse a multiple parameter line', () => {
    const [index, group, string] = parseLine(' {n} {n}: "{*}"', '   20    0:    "Hello, World!"')
    expect(index).to.be.equal(20)
    expect(group).to.be.equal(0)
    expect(string).to.be.equal('Hello, World!')
  })

  it('should parse a multiple parameter line with comments', () => {
    const [index, group, string] = parseLine(' {n} {n}: "{*}"', '  100   0:  "This error is probably due to a Disk Related Problem" # (shellext.c)')
    expect(index).to.be.equal(100)
    expect(group).to.be.equal(0)
    expect(string).to.be.equal('This error is probably due to a Disk Related Problem')
  })
})
