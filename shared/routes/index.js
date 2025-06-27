import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Root from 'pages/Root'
import NoMatch from 'components/NoMatch'
import { Landing, Dashboard, Docs, Login, Register, CaseStudies, CoinbaseHackathon } from 'routes/sync'

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
        path: 'docs',
        component: Docs
      },
      {
        path: 'login',
        component: Login
      },
      {
        path: 'register',
        component: Register
      },
      {
        path: 'case-studies',
        component: CaseStudies
      },
      {
        path: 'coinbase-hackathon',
        component: CoinbaseHackathon
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
      <Route path="docs" element={<Docs />} />
      <Route path="login" element={<Login />} />
      <Route path="register" element={<Register />} />
      <Route path="case-studies" element={<CaseStudies />} />
      <Route path="coinbase-hackathon" element={<CoinbaseHackathon />} />
      <Route path="*" element={<NoMatch />} />
    </Route>
  </Routes>
)

export default RootRoutes
