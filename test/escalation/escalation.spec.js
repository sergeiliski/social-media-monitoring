import SocialMediaMonitor from '../../src/index.js'
import Helper from '../../src/helper.js'

test('Checks database for escalations', async () => {
  const pages = Helper.getFacebookPages()
  const options = Helper.getSimpleDatabaseConfigs()
  const config = { facebook: pages, ...options }
  const smm = new SocialMediaMonitor(config)
  const messages = await smm.getMessages()
  smm.destroyConnection()
  expect(messages).not.toBeNull()
});
