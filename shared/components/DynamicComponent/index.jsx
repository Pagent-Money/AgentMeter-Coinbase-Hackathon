import React, { Component } from 'react'
import Loading from 'components/Loading'

export function syncComponent(chunkName, module) {
  const Component = module.default || module

  function SyncComponent(props) {
    return (<Component {...props} />)
  }

  SyncComponent.getInitialActions = Component.getInitialActions
  SyncComponent.chunkName = chunkName

  return SyncComponent
}

export function asyncComponent(getComponent) {
  return class AsyncComponent extends Component {
    static Component = null
    static isAsync = true

    static loadComponent() {
      return getComponent()
        .then(module => (module.default || module))
        .then((Component) => {
          AsyncComponent.Component = Component
          AsyncComponent.getInitialActions = Component.getInitialActions
          return Component
        })
    }

    mounted = false
    state = { Component: AsyncComponent.Component }

    load() {
      AsyncComponent.loadComponent().then((Component) => {
        if (this.mounted) this.setState({ Component })
      })
    }

    componentWillMount() {
      if (!this.state.Component) this.load()
    }

    componentDidMount() {
      this.mounted = true
    }

    componentWillUnmount() {
      this.mounted = false
    }

    render() {
      const { Component } = this.state
      return Component ? <Component {...this.props} /> : <Loading />
    }
  }
}
