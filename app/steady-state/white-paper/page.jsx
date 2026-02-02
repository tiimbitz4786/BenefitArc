'use client';

import Link from 'next/link';

export default function SteadyStateWhitePaper() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0f1a 100%)',
      color: '#f1f5f9',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Back Navigation */}
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        zIndex: 1000,
      }}>
        <Link 
          href="/steady-state"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '8px',
            background: 'rgba(15, 15, 25, 0.9)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: '#6366f1',
            fontSize: '13px',
            fontWeight: '500',
            textDecoration: 'none',
            backdropFilter: 'blur(10px)',
          }}
        >
          ← Back to Tool
        </Link>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 24px 60px' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '48px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            padding: '6px 14px',
            borderRadius: '20px',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: '#a5b4fc',
            fontSize: '11px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '16px',
          }}>
            White Paper
          </div>
          <h1 style={{ 
            fontSize: '36px', 
            fontWeight: '800', 
            color: '#f8fafc',
            marginBottom: '12px',
            lineHeight: '1.2',
          }}>
            Steady State Projection Model
          </h1>
          <p style={{ 
            fontSize: '18px', 
            color: '#94a3b8',
            lineHeight: '1.6',
          }}>
            A Mathematical Framework for Forecasting Social Security Disability Practice Economics
          </p>
        </div>

        {/* Article Content */}
        <article style={{ 
          fontSize: '15px', 
          color: '#cbd5e1', 
          lineHeight: '1.8',
        }}>
          
          {/* Executive Summary */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ 
              fontSize: '22px', 
              fontWeight: '700', 
              color: '#f8fafc',
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '2px solid rgba(99, 102, 241, 0.3)',
            }}>
              Executive Summary
            </h2>
            <p style={{ marginBottom: '16px' }}>
              The Steady State Projection Model provides Social Security Disability (SSD) law practices 
              with a rigorous mathematical framework for understanding their long-term economic equilibrium. 
              Unlike simple revenue projections, this model accounts for the unique dynamics of disability 
              practice: multi-year case lifecycles, tiered fee structures based on case stage, variable 
              win rates, and the compounding effects of consistent monthly intake.
            </p>
            <p>
              At its core, the model answers a fundamental question: <em>"If I maintain my current intake 
              rate and operational metrics, what will my practice look like when it reaches equilibrium?"</em>
            </p>
          </section>

          {/* The Concept */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ 
              fontSize: '22px', 
              fontWeight: '700', 
              color: '#f8fafc',
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '2px solid rgba(99, 102, 241, 0.3)',
            }}>
              The Concept of Steady State
            </h2>
            <p style={{ marginBottom: '16px' }}>
              A "steady state" occurs when a system reaches equilibrium—where inputs and outputs balance, 
              and key metrics stabilize. For an SSD practice, steady state is achieved when:
            </p>
            <ul style={{ 
              marginBottom: '16px', 
              paddingLeft: '24px',
              listStyle: 'disc',
            }}>
              <li style={{ marginBottom: '8px' }}>Monthly case resolutions equal monthly case intake</li>
              <li style={{ marginBottom: '8px' }}>Open caseload stabilizes at a predictable level</li>
              <li style={{ marginBottom: '8px' }}>Monthly revenue becomes consistent and predictable</li>
              <li style={{ marginBottom: '8px' }}>Staffing needs reach a sustainable baseline</li>
            </ul>
            <p>
              For a new or growing practice, steady state may be years away. For an established practice, 
              understanding your steady state helps identify whether you're operating above or below your 
              natural equilibrium—and what adjustments might optimize performance.
            </p>
          </section>

          {/* Key Variables */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ 
              fontSize: '22px', 
              fontWeight: '700', 
              color: '#f8fafc',
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '2px solid rgba(99, 102, 241, 0.3)',
            }}>
              Key Input Variables
            </h2>
            
            <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#a5b4fc', marginBottom: '12px', marginTop: '24px' }}>
              1. Monthly Signed Cases
            </h3>
            <p style={{ marginBottom: '16px' }}>
              The number of new clients signed per month. This is the primary driver of practice growth 
              and determines the ultimate scale of your steady-state operation. A practice signing 50 
              cases/month will have a fundamentally different steady state than one signing 200 cases/month.
            </p>

            <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#a5b4fc', marginBottom: '12px', marginTop: '24px' }}>
              2. Case Lifecycle (Duration in Months)
            </h3>
            <p style={{ marginBottom: '16px' }}>
              The average time from case signing to resolution. SSD cases typically span 18-36 months, 
              though this varies by jurisdiction, case complexity, and appeals. The lifecycle directly 
              determines your steady-state open caseload:
            </p>
            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '8px',
              padding: '16px 20px',
              marginBottom: '16px',
              fontFamily: 'monospace',
              fontSize: '14px',
            }}>
              Steady State Open Cases = Monthly Intake × Average Case Lifecycle (months)
            </div>
            <p style={{ marginBottom: '16px' }}>
              Example: 100 cases/month × 24-month lifecycle = 2,400 open cases at steady state
            </p>

            <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#a5b4fc', marginBottom: '12px', marginTop: '24px' }}>
              3. Stage-Based Resolution Distribution
            </h3>
            <p style={{ marginBottom: '16px' }}>
              SSD cases resolve at different stages, each with different fee structures and timelines. 
              The model tracks four primary resolution stages:
            </p>
            <ul style={{ 
              marginBottom: '16px', 
              paddingLeft: '24px',
              listStyle: 'disc',
            }}>
              <li style={{ marginBottom: '8px' }}><strong>Initial Application</strong> — Fastest resolution, lowest fees (typically $3,000-$6,000)</li>
              <li style={{ marginBottom: '8px' }}><strong>Reconsideration</strong> — Second-level review, moderate fees</li>
              <li style={{ marginBottom: '8px' }}><strong>ALJ Hearing</strong> — Administrative hearing, standard fees (often $6,000-$7,000)</li>
              <li style={{ marginBottom: '8px' }}><strong>Federal Court (USDC)</strong> — Appeals, highest fees ($6,000 406(b) + EAJA)</li>
            </ul>

            <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#a5b4fc', marginBottom: '12px', marginTop: '24px' }}>
              4. Win Rates by Stage
            </h3>
            <p style={{ marginBottom: '16px' }}>
              Each stage has an associated win rate that determines what percentage of cases reaching 
              that stage result in a favorable decision with fees. The model applies win rates 
              cumulatively through the case funnel.
            </p>

            <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#a5b4fc', marginBottom: '12px', marginTop: '24px' }}>
              5. Fee Amounts by Stage
            </h3>
            <p style={{ marginBottom: '16px' }}>
              Attorney fees in SSD cases are regulated and typically capped at 25% of back benefits, 
              with a statutory maximum (currently $7,200 for 406(a) fees). EAJA fees for federal court 
              cases provide additional revenue. The model uses your actual or expected fee amounts for 
              each resolution stage.
            </p>
          </section>

          {/* The Math */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ 
              fontSize: '22px', 
              fontWeight: '700', 
              color: '#f8fafc',
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '2px solid rgba(99, 102, 241, 0.3)',
            }}>
              The Mathematical Model
            </h2>
            
            <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#a5b4fc', marginBottom: '12px', marginTop: '24px' }}>
              Case Flow Calculation
            </h3>
            <p style={{ marginBottom: '16px' }}>
              The model traces each cohort of signed cases through the resolution funnel:
            </p>
            <div style={{
              background: 'rgba(15, 15, 25, 0.8)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '16px',
              fontFamily: 'monospace',
              fontSize: '13px',
              lineHeight: '1.9',
              overflowX: 'auto',
            }}>
              <div style={{ color: '#10b981' }}>// For each monthly cohort of signed cases:</div>
              <div style={{ marginTop: '8px' }}>
                <span style={{ color: '#f59e0b' }}>Initial Wins</span> = Signed × Initial_Rate × Initial_WinRate
              </div>
              <div>
                <span style={{ color: '#f59e0b' }}>To Recon</span> = Signed × (1 - Initial_Rate)
              </div>
              <div>
                <span style={{ color: '#f59e0b' }}>Recon Wins</span> = To_Recon × Recon_Rate × Recon_WinRate
              </div>
              <div>
                <span style={{ color: '#f59e0b' }}>To Hearing</span> = To_Recon × (1 - Recon_Rate)
              </div>
              <div>
                <span style={{ color: '#f59e0b' }}>Hearing Wins</span> = To_Hearing × Hearing_Rate × Hearing_WinRate
              </div>
              <div>
                <span style={{ color: '#f59e0b' }}>To USDC</span> = To_Hearing × (1 - Hearing_Rate) × Appeal_Rate
              </div>
              <div>
                <span style={{ color: '#f59e0b' }}>USDC Wins</span> = To_USDC × USDC_WinRate
              </div>
            </div>

            <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#a5b4fc', marginBottom: '12px', marginTop: '24px' }}>
              Revenue Calculation
            </h3>
            <p style={{ marginBottom: '16px' }}>
              Monthly steady-state revenue is the sum of fees from all resolution stages:
            </p>
            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '8px',
              padding: '16px 20px',
              marginBottom: '16px',
              fontFamily: 'monospace',
              fontSize: '14px',
            }}>
              Monthly Revenue = Σ (Wins at Stage × Fee at Stage)
            </div>
            <p style={{ marginBottom: '16px' }}>
              For federal court cases, revenue includes both 406(b) fees and EAJA fees:
            </p>
            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '8px',
              padding: '16px 20px',
              marginBottom: '16px',
              fontFamily: 'monospace',
              fontSize: '14px',
            }}>
              USDC Revenue = USDC_Wins × (406b_Fee + EAJA_Fee)
            </div>

            <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#a5b4fc', marginBottom: '12px', marginTop: '24px' }}>
              Open Caseload Calculation
            </h3>
            <p style={{ marginBottom: '16px' }}>
              The steady-state open caseload is calculated by summing expected cases at each stage, 
              weighted by the time spent at each stage:
            </p>
            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '8px',
              padding: '16px 20px',
              marginBottom: '16px',
              fontFamily: 'monospace',
              fontSize: '14px',
            }}>
              Open Cases = Monthly_Intake × Weighted_Average_Lifecycle
            </div>
          </section>

          {/* Practical Applications */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ 
              fontSize: '22px', 
              fontWeight: '700', 
              color: '#f8fafc',
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '2px solid rgba(99, 102, 241, 0.3)',
            }}>
              Practical Applications
            </h2>
            
            <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#a5b4fc', marginBottom: '12px', marginTop: '24px' }}>
              Staffing Planning
            </h3>
            <p style={{ marginBottom: '16px' }}>
              Knowing your steady-state caseload enables rational staffing decisions. If your model 
              projects 2,400 open cases at steady state and your target is 150 cases per case manager, 
              you'll need 16 case managers at equilibrium. You can plan hiring to match your growth 
              trajectory toward that target.
            </p>

            <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#a5b4fc', marginBottom: '12px', marginTop: '24px' }}>
              Marketing Investment
            </h3>
            <p style={{ marginBottom: '16px' }}>
              The model reveals the long-term revenue impact of intake changes. Adding 10 cases/month 
              to intake doesn't just add 10 cases—it eventually adds (10 × lifecycle) to your open 
              caseload and a proportional increase to monthly revenue. This helps justify (or question) 
              marketing investments.
            </p>

            <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#a5b4fc', marginBottom: '12px', marginTop: '24px' }}>
              Operational Benchmarking
            </h3>
            <p style={{ marginBottom: '16px' }}>
              Comparing your actual metrics to the steady-state projection reveals operational 
              opportunities. If your actual revenue lags your projected steady state, you may have 
              case processing bottlenecks, win rate issues, or fee collection problems to address.
            </p>

            <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#a5b4fc', marginBottom: '12px', marginTop: '24px' }}>
              Scenario Planning
            </h3>
            <p style={{ marginBottom: '16px' }}>
              The model supports "what-if" analysis: What happens if we increase intake by 20%? 
              What's the impact of improving hearing win rates by 5%? What if average case duration 
              increases due to SSA backlogs? These scenarios help practices prepare for different futures.
            </p>
          </section>

          {/* Limitations */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ 
              fontSize: '22px', 
              fontWeight: '700', 
              color: '#f8fafc',
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '2px solid rgba(99, 102, 241, 0.3)',
            }}>
              Model Limitations
            </h2>
            <p style={{ marginBottom: '16px' }}>
              Like all models, the Steady State Projection is a simplification of reality. Key limitations include:
            </p>
            <ul style={{ 
              marginBottom: '16px', 
              paddingLeft: '24px',
              listStyle: 'disc',
            }}>
              <li style={{ marginBottom: '8px' }}>
                <strong>Assumes constant inputs</strong> — Real practices experience variable intake, 
                changing win rates, and evolving fee structures
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Ignores case attrition</strong> — Some cases are lost to client non-cooperation, 
                death, or other factors not captured in win/loss rates
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Simplified stage model</strong> — Real case flow is more complex, with remands, 
                multiple hearings, and other variations
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>No seasonality</strong> — Actual revenue may vary seasonally based on SSA 
                processing patterns
              </li>
              <li style={{ marginBottom: '8px' }}>
                <strong>Fee variability</strong> — Actual fees vary based on back benefit amounts, 
                not just stage of resolution
              </li>
            </ul>
            <p>
              Despite these limitations, the model provides valuable directional insights and a 
              framework for thinking systematically about practice economics.
            </p>
          </section>

          {/* Conclusion */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ 
              fontSize: '22px', 
              fontWeight: '700', 
              color: '#f8fafc',
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '2px solid rgba(99, 102, 241, 0.3)',
            }}>
              Conclusion
            </h2>
            <p style={{ marginBottom: '16px' }}>
              The Steady State Projection Model transforms intuition about practice growth into 
              quantifiable projections. By understanding the mathematical relationships between 
              intake, case duration, win rates, and fees, practice leaders can make more informed 
              decisions about growth, staffing, and investment.
            </p>
            <p>
              The model doesn't predict the future—it illuminates the logical consequences of current 
              trajectories. That clarity is invaluable for practices seeking to grow strategically 
              rather than reactively.
            </p>
          </section>

          {/* CTA */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            marginTop: '48px',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc', marginBottom: '8px' }}>
              Ready to Model Your Practice?
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>
              Use the Steady State Projection tool to calculate your practice's equilibrium metrics.
            </p>
            <Link 
              href="/steady-state"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '600',
                textDecoration: 'none',
              }}
            >
              Launch Steady State Tool →
            </Link>
          </div>

        </article>
      </div>
    </div>
  );
}
