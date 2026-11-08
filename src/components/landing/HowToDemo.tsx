/** Live product demo for the landing “Getting started” section. */

type HowToDemoProps = {
  step: 0 | 1 | 2
}

export function HowToDemo({ step }: HowToDemoProps) {
  return (
    <div className={`lp2-htomo is-step-${step}`} aria-hidden>
      <div className="lp2-htomo__desk">
        <div className="lp2-htomo__window">
          <div className="lp2-htomo__bar">
            <span className="lp2-htomo__dots">
              <i />
              <i />
              <i />
            </span>
            <span className="lp2-htomo__bar-title">OneTrack</span>
          </div>

          <div className="lp2-htomo__scenes">
            <div className="lp2-htomo__scene lp2-htomo__scene--agency">
              <p className="lp2-htomo__scene-label">New agency</p>
              <div className="lp2-htomo__field">
                <span>Agency name</span>
                <strong className="lp2-htomo__type">
                  <em>Horizon Travel</em>
                  <i className="lp2-htomo__caret" />
                </strong>
              </div>
              <div className="lp2-htomo__field">
                <span>Primary service</span>
                <strong>Student visa</strong>
              </div>
              <div className="lp2-htomo__invite">
                <span className="lp2-htomo__invite-label">Invite desk</span>
                <div className="lp2-htomo__avatars">
                  <b className="is-a">R</b>
                  <b className="is-b">N</b>
                  <b className="is-c">+</b>
                </div>
              </div>
              <div className="lp2-htomo__stages-mini">
                <span>Intake</span>
                <span>Docs</span>
                <span>Ready</span>
              </div>
            </div>

            <div className="lp2-htomo__scene lp2-htomo__scene--files">
              <p className="lp2-htomo__scene-label">Service board</p>
              <div className="lp2-htomo__board">
                <div className="lp2-htomo__col">
                  <header>
                    Intake <em>2</em>
                  </header>
                  <article className="lp2-htomo__file is-1">
                    <span className="lp2-htomo__avatar">R</span>
                    <div>
                      <strong>R. Hossain</strong>
                      <small>Student visa · CA</small>
                    </div>
                    <i className="is-new">New</i>
                  </article>
                </div>
                <div className="lp2-htomo__col">
                  <header>
                    Documents <em>1</em>
                  </header>
                  <article className="lp2-htomo__file is-2">
                    <span className="lp2-htomo__avatar">N</span>
                    <div>
                      <strong>N. Akter</strong>
                      <small>Umrah · SA</small>
                    </div>
                    <i className="is-docs">Docs</i>
                  </article>
                  <div className="lp2-htomo__doc-fly">
                    <span>Passport</span>
                    <span>NID</span>
                  </div>
                </div>
                <div className="lp2-htomo__col">
                  <header>
                    Ready <em>1</em>
                  </header>
                  <article className="lp2-htomo__file is-3">
                    <span className="lp2-htomo__avatar">S</span>
                    <div>
                      <strong>S. Islam</strong>
                      <small>Tourist · TH</small>
                    </div>
                    <i className="is-ready">Ready</i>
                  </article>
                </div>
              </div>
              <div className="lp2-htomo__pay-chip">
                <span>Balance due</span>
                <strong>৳65,000</strong>
              </div>
            </div>

            <div className="lp2-htomo__scene lp2-htomo__scene--link">
              <p className="lp2-htomo__scene-label">Client tracking</p>
              <div className="lp2-htomo__link-row">
                <div className="lp2-htomo__link-pill">
                  <span>onetrack.app/t/n-akter</span>
                  <em>Copied</em>
                </div>
              </div>
              <ol className="lp2-htomo__timeline">
                <li className="is-done">Documents received</li>
                <li className="is-done">Submitted to embassy</li>
                <li className="is-now">Awaiting decision</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="lp2-htomo__phone">
          <div className="lp2-htomo__phone-notch" />
          <p className="lp2-htomo__phone-brand">N. Akter · Umrah</p>
          <div className="lp2-htomo__phone-bar">
            <i />
            <i />
            <i />
            <i className="is-live" />
          </div>
          <p className="lp2-htomo__phone-status">Stage: Docs in</p>
          <div className="lp2-htomo__sms">
            Nusrat, your Umrah file is now Docs in.
            <span>Sent automatically</span>
          </div>
        </div>
      </div>
    </div>
  )
}
