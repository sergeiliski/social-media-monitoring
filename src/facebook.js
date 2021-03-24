import * as axios from 'axios'
import Helper from './helper'

class Facebook {

  baseUrl = 'https://graph.facebook.com/'
  pages = []

  constructor(options) {
    this.pages = options.pages
  }

  async getMessages() {
    const directMessages = await this.getDirectMessages(this.pages)
    const feedMessages = await this.getFeedMessages(this.pages)
    return [...directMessages, ...feedMessages]
  }

  async getDirectMessages(pages) {
    // https://developers.facebook.com/docs/graph-api/reference/v9.0/conversation
    // https://developers.facebook.com/docs/graph-api/reference/page/conversations
    for (const page of pages) {
      const fields = ''.concat('messages', '{', ['message', 'attachments', 'shares', 'from', 'created_time'].join(','), '}')
      const token = page.token
      const url = ''.concat(this.baseUrl, ''.concat(page.id, '/', 'conversations'), '?fields=', fields, '&access_token=', token, '&limit=1')
      const results = await this.getAllResults(url)
      const messages = results.map((m) => {
        const comments = m.messages.data
        return {
          comments: comments.reverse(),
          message_type: 'direct',
          id: m.id,
          page_id: page.id,
          channel: 'facebook',
          thread_id: comments[0].from.id
        }
      })
      return messages
    }
  }

  async getFeedMessages(pages) {
    // https://developers.facebook.com/docs/graph-api/reference/v9.0/page/feed
    for (const page of pages) {
      const fields = ['from', 'to', 'message', 'created_time', 'updated_time', 'comments.limit(999)'].join(',')
      const token = page.token
      const url = ''.concat(this.baseUrl, ''.concat(page.id, '/', 'feed'), '?fields=', fields, '&access_token=', token, '&limit=1')
      const results = await this.getAllResults(url)
      const messages = results.map((m) => {
        const comment = {
          created_time: m.created_time,
          from: m.from,
          message: m.message,
          id: m.id,
          page_id: page.id
        }
        if (m.comments) {
          m.comments.data.unshift(comment)
        }
        return {
          comments: m.comments ? m.comments.data.sort((a, b) => new Date(a.created_time) - new Date(b.created_time)) : [comment],
          message_type: 'feed',
          id: m.id,
          page_id: page.id,
          channel: 'facebook',
          thread_id: m.id
        }
      })
      return messages
    }
  }

  async getAllResults(url) {
    let results = []
    let next = true
    while (next) {
      const response = await axios.get(url)
      if (!response || !response.data || !response.data.paging || !response.data.paging.next) {
        next = false
      }
      results = [...results, ...response.data.data]
      url = response.data.paging.next
    }
    return results
  }

  async sendDirectMessage(recipient_id, message, token) {
    // https://graph.facebook.com/v9.0/me/messages?access_token=EAALhtPBbe9oBAFDW5pfCaf5ZANQ6LWNIuQdPqRkciQ2XicK8issW0DOyrjQmWZCi8QPuZAyxjp3t8pRSNJzndu9KTr3zwKAzH4Jvhn1PU5CYfmIwwn6abrIZBwDLSMOlEIRZATByBdFI0P7ZBn5PICwZBINXO15NHQhVTJZCDhchAgZDZD
    const fields = ['v9.0', 'me', 'messages'].join('/')
    const url = ''.concat(this.baseUrl, fields, '?access_token=', token)
    const obj = {
      messaging_type: 'RESPONSE',
      recipient: {
        id: recipient_id
      },
      message: {
        text: message
      }
    }

    try {
      return await axios.post(url, obj)
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        console.info(error.response.data.error.message)
      }
      return null
    }
  }

  async sendPostMessage(comment_id, message, token) {
    // https://developers.facebook.com/docs/graph-api/reference/v9.0/object/comments
    const fields = ['v9.0', comment_id, 'comments'].join('/')
    const url = ''.concat(this.baseUrl, fields, '?message=', message, '&access_token=', token)

    try {
      return await axios.post(url)
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        console.info(error.response.data.error.message)
      }
      return null
    }
  }

  async reply(message) {
    const token = this.pages.filter((page) => {
      return page.id === message.page_id
    })

    if (!token || token.length > 1) {
      throw Error(`Page ${message.page_id} occurs multiple time in page options`)
    }

    if (!token || token.length < 1) {
      throw Error(`Page ${message.page_id} has no page options`)
    }

    if (!message.message_type) {
      throw Error(`Message ${message.id} cannot be without message type`)
    }

    if (typeof message.message_type !== 'string') {
      throw Error(`Message ${message.id} message type is not a string`)
    }

    const action = {
      'direct': this.sendDirectMessage,
      'feed': this.sendPostMessage
    };

    if (action[message.message_type]) {
      // first one is either commend_id or recipient_id?
      return await action[message.message_type].call(this, message.thread_id, message.message, token[0].token);
    }

    return null;
  }

  async deletePostMessage(comment_id, token) {
    const fields = ['v9.0', comment_id].join('/')
    const url = ''.concat(this.baseUrl, fields, '&access_token=', token)
    try {
      return await axios.delete(url)
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        console.info(error.response.data.error.message)
      }
      return null
    }
  }

}

export default Facebook

