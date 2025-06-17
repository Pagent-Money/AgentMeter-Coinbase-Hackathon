import React, { useEffect, useState, useCallback, Fragment } from 'react'
import { Link } from 'react-router-dom'
// import { CdpClient } from '@coinbase/cdp-sdk'
import { config } from 'dotenv'
import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import { wrapFetchWithPayment, decodeXPaymentResponse } from 'x402-fetch'
import classNames from 'classnames'
import styles from './style.css'

config()

const Landing = () => {
  const createWallet = useCallback(() => {
    const start = async () => {
      const account = privateKeyToAccount(process.env.PRIVATE_KEY)
      console.log('createWallet', account)

      const fetchWithPayment = wrapFetchWithPayment(fetch, account)

      fetchWithPayment(`http://localhost:4021/weather`, { method: 'GET' }).then(async response => {
        const body = await response.json()
        console.log(body)

        const paymentResponse = decodeXPaymentResponse(response.headers.get('x-payment-response'))
        console.log(paymentResponse)
      }).catch(error => {
        console.log('error', error.message)
      })
    }

    start()
  }, [])

  return (
    <Fragment>
      <div className={styles.landing}>
        <div className={classNames(styles.section, styles.intro)}>
          <div className={styles.content}>
            <div onClick={createWallet}>Create</div>
          </div>
        </div>
      </div>
    </Fragment>
  )
}

export default Landing
