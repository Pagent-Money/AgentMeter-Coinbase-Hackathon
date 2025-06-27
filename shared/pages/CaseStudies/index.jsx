import React, { useState } from 'react';
import './style.css';

const CaseStudies = () => {
  const [activeTab, setActiveTab] = useState('api-requests');

  const caseStudies = {
    'api-requests': {
      title: 'API Request Metering',
      subtitle: 'Usage-based billing for API services',
      scenario: 'WeatherAPI Pro charges customers based on the number of API requests they make.',
      challenge: 'Track API requests in real-time and implement fair usage-based pricing.',
      solution: 'Using AgentMeter to track each API call and charge customers precisely.',
      code: `// Weather API with AgentMeter integration
import { AgentMeter } from '@agentmeter/sdk-python';

meter = AgentMeter(api_key='your_api_key')

@app.route('/weather/<city>')
def get_weather(city):
    # Record the API request
    meter.record_event(
        customer_id=request.headers.get('X-Customer-ID'),
        event_type='api_request',
        quantity=1,
        metadata={
            'endpoint': '/weather',
            'city': city,
            'timestamp': datetime.utcnow().isoformat()
        }
    )
    
    # Return weather data
    return jsonify(get_weather_data(city))`,
      results: [
        '99.9% accurate billing based on actual usage',
        '40% increase in customer satisfaction',
        '60% reduction in billing disputes',
        'Real-time usage tracking and alerts'
      ]
    },
    'agent-tokens': {
      title: 'AI Agent Token Metering',
      subtitle: 'Separate billing for input/output tokens',
      scenario: 'ChatBot Inc. provides AI assistance and needs to charge for both input and output tokens separately.',
      challenge: 'Track token usage with different pricing for input vs output tokens.',
      solution: 'AgentMeter tracks input and output tokens separately with custom pricing.',
      code: `// AI Agent with token-based metering
import { AgentMeter } from '@agentmeter/sdk-python';

meter = AgentMeter(api_key='your_api_key')

async def process_chat_request(customer_id, message):
    input_tokens = count_tokens(message)
    
    # Record input tokens
    meter.record_event(
        customer_id=customer_id,
        event_type='input_tokens',
        quantity=input_tokens,
        metadata={'message_id': str(uuid.uuid4())}
    )
    
    # Generate AI response
    response = await ai_model.generate(message)
    output_tokens = count_tokens(response)
    
    # Record output tokens
    meter.record_event(
        customer_id=customer_id,
        event_type='output_tokens',
        quantity=output_tokens,
        metadata={'response_id': str(uuid.uuid4())}
    )
    
    return response`,
      results: [
        'Precise token-level billing accuracy',
        '25% more profitable pricing model',
        'Transparent usage breakdown for customers',
        'Automatic scaling with usage patterns'
      ]
    },
    'instant-pay': {
      title: 'Instant Pay Meter',
      subtitle: 'Real-time payments for gaming and e-commerce',
      scenario: 'GameVault offers premium features and needs instant micropayments for in-game purchases.',
      challenge: 'Enable real-time payments without traditional payment gateway delays.',
      solution: 'AgentMeter with x402 micropayments for instant, low-cost transactions.',
      code: `// Gaming platform with instant payments
import { AgentMeter } from '@agentmeter/sdk-python';

meter = AgentMeter(
    api_key='your_api_key',
    payment_method='x402_micropayments'
)

@app.route('/purchase/<item_id>')
def purchase_item(item_id):
    customer_id = request.headers.get('X-Customer-ID')
    item = get_item(item_id)
    
    # Record instant payment event
    payment_result = meter.record_payment_event(
        customer_id=customer_id,
        event_type='premium_purchase',
        amount_cents=item.price_cents,
        metadata={
            'item_id': item_id,
            'item_name': item.name,
            'game_session': request.headers.get('X-Session-ID')
        }
    )
    
    if payment_result.status == 'success':
        # Grant item immediately
        grant_item_to_player(customer_id, item_id)
        return jsonify({'status': 'success', 'item': item.serialize()})
    
    return jsonify({'status': 'payment_failed'}), 402`,
      results: [
        'Sub-second payment processing',
        '90% reduction in transaction fees',
        '50% increase in conversion rates',
        'Zero payment gateway dependencies'
      ]
    }
  };

  const currentCase = caseStudies[activeTab];

  return (
    <div className="case-studies-page">
      <div className="case-studies-container">
        <div className="case-studies-header">
          <h1>Case Studies</h1>
          <p>Real-world examples of how businesses use AgentMeter to implement usage-based billing</p>
        </div>

        <div className="case-studies-tabs">
          <button
            className={`tab-button ${activeTab === 'api-requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('api-requests')}
          >
            <div className="tab-icon">🌐</div>
            <span>API Requests</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'agent-tokens' ? 'active' : ''}`}
            onClick={() => setActiveTab('agent-tokens')}
          >
            <div className="tab-icon">🤖</div>
            <span>AI Tokens</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'instant-pay' ? 'active' : ''}`}
            onClick={() => setActiveTab('instant-pay')}
          >
            <div className="tab-icon">⚡</div>
            <span>Instant Pay</span>
          </button>
        </div>

        <div className="case-study-content">
          <div className="case-study-header">
            <h2>{currentCase.title}</h2>
            <p className="subtitle">{currentCase.subtitle}</p>
          </div>

          <div className="case-study-grid">
            <div className="case-study-info">
              <div className="info-section">
                <h3>📋 Scenario</h3>
                <p>{currentCase.scenario}</p>
              </div>

              <div className="info-section">
                <h3>⚠️ Challenge</h3>
                <p>{currentCase.challenge}</p>
              </div>

              <div className="info-section">
                <h3>💡 Solution</h3>
                <p>{currentCase.solution}</p>
              </div>

              <div className="info-section">
                <h3>📈 Results</h3>
                <ul className="results-list">
                  {currentCase.results.map((result, index) => (
                    <li key={index}>{result}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="case-study-code">
              <div className="code-header">
                <h3>Implementation Code</h3>
                <div className="code-language">Python</div>
              </div>
              <pre className="code-block">
                <code>{currentCase.code}</code>
              </pre>
            </div>
          </div>
        </div>

        <div className="case-studies-cta">
          <div className="cta-content">
            <h3>Ready to implement usage-based billing?</h3>
            <p>Start building with AgentMeter today and see the difference precise metering makes.</p>
            <div className="cta-buttons">
              <a href="/register" className="cta-button primary">Get Started Free</a>
              <a href="/docs" className="cta-button secondary">View Documentation</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseStudies; 