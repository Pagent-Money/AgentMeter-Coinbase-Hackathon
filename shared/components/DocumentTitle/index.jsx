import React, { Component } from 'react'

let titles = []

const getTitle = () => titles[titles.length - 1]

const updateTitle = () => {
  document.title = getTitle()
}

export const flushTitle = () => {
  const title = getTitle()
  titles = []
  return title
}

export default class Title extends Component {
  state = {
    index: titles.push('') - 1
  }

  componentDidMount() {
    titles = titles.filter(n => n)
    this.setState({ index: titles.length - 1 }) /* eslint-disable-line react/no-did-mount-set-state */
  }

  componentWillUnmount() {
    if (this.state.index < titles.length - 1) {
      titles[this.state.index] = ''
    } else {
      titles.pop()
    }
  }

  componentDidUpdate() {
    updateTitle()
  }

  render() {
    const { render } = this.props
    titles[this.state.index] = render

    return null
  }
}
