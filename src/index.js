import Facebook from './facebook.js'
import Instagram from './instagram.js'
import Linkedin from './linkedin.js'
import { uuid } from 'uuidv4'
import Knex from 'knex'
import Helper from './helper.js'
// https://devhints.io/knex

class SocialMediaMonitor {

  facebook = null
  instagram = null
  linkedin = null
  database = null
  databaseOptions = {}

  channels = [ 'facebook', 'instagram', 'linkedin' ]

  constructor(config) {
    const options = {
      facebook: { pages: [] },
      instagram: { pages: [] },
      linkedin: { pages: [] }
    }
    if (typeof config === 'object' && config !== null) {
      if (config.facebook instanceof Array) {
        options.facebook.pages = config.facebook
      }
      if (config.instagram instanceof Array) {
        options.instagram.pages = config.instagram
      }
      if (config.linkedin instanceof Array) {
        options.linkedin.pages = config.linkedin
      }
      if (config.databaseOptions) {
        const required = [ 'host', 'port', 'user', 'password', 'database' ]
        if (required.every(item => config.databaseOptions.hasOwnProperty(item))) {
          required.forEach(item => this.databaseOptions[item] = config.databaseOptions[item])
        } else {
          throw new Error('invalid database options')
        }
      }
    }
    const info = { limit: this.limit }
    this.facebook = new Facebook({ ...options.facebook, ...info })
    this.instagram = new Instagram({ ...options.instagram, ...info })
    this.linkedin = new Linkedin({ ...options.facebook, ...info })
  }

  async connect() {
    if (this.databaseOptions) {
      const options = {
        client: this.databaseOptions.client || 'pg',
        version: this.databaseOptions.version || '7.2',
        connection: {
          host : this.databaseOptions.host,
          port : this.databaseOptions.port,
          user : this.databaseOptions.user,
          password : this.databaseOptions.password,
          database : this.databaseOptions.database
        }
      }

      try {
        this.database = Knex(options)
        const exists = await this.database.schema.hasTable(Helper.getTableName())
        if (!exists) {
          await this.database.schema.createTable(Helper.getTableName(), (table) => {
            table.increments();
            table.string('uuid').defaultTo(uuid())
            table.string('page_id');
            table.string('comment_id');
            table.boolean('facebook').defaultTo(false)
            table.boolean('instagram').defaultTo(false)
            table.boolean('linkedin').defaultTo(false)
            table.boolean('direct_message').defaultTo(false)
            table.boolean('feed_message').defaultTo(false)
            table.boolean('adverse').defaultTo(false)
            table.boolean('pqc').defaultTo(false)
            table.boolean('mi').defaultTo(false)
            table.boolean('handled').defaultTo(false)
            table.boolean('spam').defaultTo(false)
            table.json('metadata').defaultTo({})
          })
        }
      } catch (error) {
        throw error
      }
    } else {
      console.info('no database options provided')
    }
  }

  getConnection() {
    return this.database
  }

  destroyConnection() {
    if (this.database) {
      return this.database.destroy()
    }
  }

  async getMessages() {
    const messages = [
      ...(await this.facebook.getMessages())
    ]
    return messages
  }

  async reply(messages) {
    // [{
    //   text: 'Thank you for your message. Fuck off.',
    //   facebook: true,
    //   feed_message: false,
    //   direct_message: true,
    //   page_id: '55535',
    //   comment: {
    //     id: '12345'
    //   },
    //   from: {
    //     id: '355535'
    //   }
    // }]
    messages = [].concat(messages)
    console.log('messages:', messages);
    for (const i in messages) {
      const message = messages[i]

      if (!message.message || !message.page_id) {
        return null
      }

      if (!message.message_type) {
        return null
      }

      if (!message.message) {
        return null
      }

      // Check for object correctness separately?
      const channel = this.channels[this.channels.indexOf(message.channel)];
      console.log('channel', channel);

      if (!channel) {
        throw Error(`message ${message.id} has no channels`)
      }
      console.log('message:', message);
      return this[channel].reply(message) // ie. this.facebook.reply(message)
    }
  }

  async setReplied(messages) {
    messages = [].concat(messages)
    messages.forEach(v => v.replied = true);
    return await this.database
    .insert(messages)
    .onConflict(['comment_id', 'page_id']) // is this AND or OR -> We need AND
    .merge()
    .returning('*');
  }
}

export default SocialMediaMonitor

