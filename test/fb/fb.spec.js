import Facebook from '../../src/facebook.js';
import Helper from '../../src/helper.js';

test('Facebook getMessages() returns not null', async () => {
  const pages = Helper.getFacebookPages()
  const fb = new Facebook({ pages: pages})
  const messages = await fb.getMessages()
  expect(messages).not.toBeNull()
});

test('Facebook getComment() returns not null', async () => {
  const pages = Helper.getFacebookPages()
  const fb = new Facebook({ pages: pages})
  const messages = await fb.getComment(pages[0], '230482852179178_230488138845316')
  expect(messages).not.toBeNull()
});
