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
    const errors = [...directMessages.errors, ...feedMessages.errors]
    return {
      messages: [...directMessages.messages, ...feedMessages.messages],
      errors: errors.filter((error, index, self) => {
        return self.findIndex(t => t.id === error.id && t.message.substring(0, 15) === error.message.substring(0, 15)) === index
      })
    }
  }

  async getDirectMessages(pages) {
    // https://developers.facebook.com/docs/graph-api/reference/v9.0/conversation
    // https://developers.facebook.com/docs/graph-api/reference/page/conversations
    const response = { messages: [], errors: [] }
    for (const page of pages) {
      const fields = ''.concat('messages', '{', ['message', 'attachments', 'shares', 'from', 'created_time'].join(','), '}')
      const token = page.token
      const url = ''.concat(this.baseUrl, ''.concat(page.id, '/', 'conversations'), '?fields=', fields, '&access_token=', token, '&limit=1')
      try {
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
        response.messages = response.messages.concat(messages)
      } catch (error) {
        try {
          response.errors.push({ message: error.response.data.error.message,  id: page.id })
        } catch (secondaryError) {
          response.errors.push({ message: 'Unknown error',  id: page.id })
        }
      }
    }
    return response
  }

  async getFeedMessages(pages) {
    // https://developers.facebook.com/docs/graph-api/reference/v10.0/page/feed
    const response = { messages: [], errors: [] }
    for (const page of pages) {
      const fields = [
        'from',
        'to',
        'message',
        'created_time',
        'updated_time',
        'comments{from,created_time,message,comments{from,message,created_time}}'
      ].join(',')
      const token = page.token
      const url = ''.concat(this.baseUrl, ''.concat(page.id, '/', 'feed'), '?fields=', fields, '&access_token=', token)
      try {
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
          const comments = m.comments ? m.comments.data.sort((a, b) => new Date(a.created_time) - new Date(b.created_time)) : [comment];
          comments.forEach((topLevelComment, i) => {
            if (!topLevelComment.comments) {
              return [];
            }
            const lowComments = {};
            lowComments.data = topLevelComment.comments.data
              .map((lowLevelComment) => {
                return {
                  created_time: lowLevelComment.created_time,
                  from: lowLevelComment.from,
                  message: lowLevelComment.message,
                  id: lowLevelComment.id,
                  page_id: page.id,
                }
              });
            comments[i].comments = lowComments
              .data.sort(
                (a, b) => new Date(a.created_time) - new Date(b.created_time)
              );
          });
          return {
            comments: comments,
            message_type: 'feed',
            id: m.id,
            page_id: page.id,
            channel: 'facebook',
            thread_id: m.id
          }
        })
        response.messages = response.messages.concat(messages)
      } catch (error) {
        try {
          response.errors.push({ message: error.response.data.error.message,  id: page.id })
        } catch (secondaryError) {
          response.errors.push({ message: 'Unknown error',  id: page.id })
        }
      }
    }
    return response
  }

  async getAllResults(url) {
    let results = []
    let next = true
    while (next) {
      const response = await axios.get(url)
      if (!response || !response.data || !response.data.paging || !response.data.paging.next) {
        next = false
        return [...results, ...response.data.data];
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

  async getExportData(comments, clients) {
    const options = {
      pages: [],
      ids: [],
      required: {
        direct: false,
        feed: false
      }
    };
    const data = {
      feed: [],
      direct: []
    };
    comments.forEach((comment) => {
      if (comment.channel !== 'facebook') {
        return;
      }
      options.pages.push(comment.page_id);
      options.ids.push(comment.comment_id);
      if (comment.message_type === 'feed') {
        options.required.feed = true;
      }
      if (comment.message_type === 'direct') {
        options.required.direct = true;
      }
    })
    if (options.required.feed) {
      const pages = clients.filter(c => options.pages.includes(c.id))
      const messages = await this.getFeedMessages(pages);
      data.feed = [].concat.apply([], messages.messages.map(m => m.comments ? m.comments : []), messages.messages);
      data.feed = data.feed.filter(m => options.ids.includes(m.id));
      comments.forEach((comment, i) => {
        if (comment.channel === 'facebook' && comment.message_type === 'feed') {
          const idx = data.feed.findIndex((c) => {
            return c.id === comment.comment_id;
          });
          if (idx > -1) {
            comments[i].message = data.feed[idx].message;
          }
        }
      })
    }
    if (options.required.direct) {
      const pages = clients.filter(c => options.pages.includes(c.id))
      const messages = await this.getDirectMessages(pages);
      data.direct = [].concat.apply([], messages.messages.map(m => m.comments ? m.comments : []), messages.messages);
      data.direct = data.direct.filter(m => options.ids.includes(m.id));
      comments.forEach((comment, i) => {
        if (comment.channel === 'facebook' && comment.message_type === 'direct') {
          const idx = data.direct.findIndex((c) => {
            return c.id === comment.comment_id;
          });
          if (idx > -1) {
            comments[i].message = data.direct[idx].message;
          }
        }
      })
    }
    return comments;
  }

}

export default Facebook

