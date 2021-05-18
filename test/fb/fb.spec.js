import Facebook from '../../src/facebook.js';
import Helper from '../../src/helper.js';

test('Facebook getMessages() returns not null', async () => {
  const pages = Helper.getFacebookPages()
  const fb = new Facebook({ pages: pages})
  const messages = await fb.getMessages()
  expect(messages).not.toBeNull()
});
