import React from 'react'
import { Navigate } from 'react-router-dom'

const NoMatch = (props) => {
  return (<Navigate to="/" replace="true" />)
}

export default NoMatch
