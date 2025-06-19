import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Root from 'pages/Root'
import NoMatch from 'components/NoMatch'
import { Landing } from 'routes/sync'
import { Dashboard } from 'routes/sync'
import { Chat } from 'routes/sync'
import { Search } from 'routes/sync'

export const routes = [
  {
    path: '*',
    component: Root,
    children: [
      {
        index: true,
        component: Landing
      },
      {
        path: 'dashboard',
        component: Dashboard
      },
      {
        path: 'chat',
        component: Dashboard
      },
      {
        path: 'search',
        component: Search
      },
      {
        path: '*',
        component: NoMatch
      }
    ]
  }
]

export const RootRoutes = () => (
  <Routes>
    <Route path="*" element={<Root />}>
      <Route index element={<Landing />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="chat" element={<Chat />} />
      <Route path="search" element={<Search />} />
      <Route path="*" element={<NoMatch />} />
    </Route>
  </Routes>
)

export default RootRoutes
