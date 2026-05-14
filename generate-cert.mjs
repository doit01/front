import selfsigned from 'selfsigned'
import { writeFileSync } from 'fs'
import { join } from 'path'

const attrs = [{ name: 'commonName', value: 'localhost' }]
const pems = await selfsigned.generate(attrs, { days: 365, keySize: 2048 })

writeFileSync(join('C:', 'Users', '86152', 'kit', 'nginx-1.30.1', 'conf', 'localhost.crt'), pems.cert)
writeFileSync(join('C:', 'Users', '86152', 'kit', 'nginx-1.30.1', 'conf', 'localhost.key'), pems.private)

console.log('Certificate generated!')