/** Mini motion graphics for the landing customize section. */

export function CustomizeServicesMotion() {
  return (
    <div className="lp2-cmotion lp2-cmotion--services" aria-hidden>
      <span className="lp2-cmotion__chip is-a">Tourist</span>
      <span className="lp2-cmotion__chip is-b">Student</span>
      <span className="lp2-cmotion__chip is-c">Work</span>
      <span className="lp2-cmotion__chip is-add">
        <i>+</i>
        Hajj package
      </span>
    </div>
  )
}

export function CustomizeStagesMotion() {
  return (
    <div className="lp2-cmotion lp2-cmotion--stages" aria-hidden>
      <div className="lp2-cmotion__rail">
        <span className="lp2-cmotion__node is-1">
          <b>1</b>
          Intake
        </span>
        <span className="lp2-cmotion__node is-2">
          <b>2</b>
          Docs
        </span>
        <span className="lp2-cmotion__node is-3">
          <b>3</b>
          Ready
        </span>
      </div>
      <span className="lp2-cmotion__rename">Embassy</span>
      <span className="lp2-cmotion__cursor" />
    </div>
  )
}

export function CustomizeDocsMotion() {
  return (
    <div className="lp2-cmotion lp2-cmotion--docs" aria-hidden>
      <div className="lp2-cmotion__row is-1">
        <span className="lp2-cmotion__check" />
        <span className="lp2-cmotion__line">Passport</span>
        <span className="lp2-cmotion__badge">Required</span>
      </div>
      <div className="lp2-cmotion__row is-2">
        <span className="lp2-cmotion__check" />
        <span className="lp2-cmotion__line">NID</span>
        <span className="lp2-cmotion__badge">Required</span>
      </div>
      <div className="lp2-cmotion__row is-3">
        <span className="lp2-cmotion__check is-optional" />
        <span className="lp2-cmotion__line">Bank statement</span>
        <span className="lp2-cmotion__badge is-soft">Optional</span>
      </div>
    </div>
  )
}

export function CustomizeFieldsMotion() {
  return (
    <div className="lp2-cmotion lp2-cmotion--fields" aria-hidden>
      <label className="lp2-cmotion__field is-1">
        <span>Passport number</span>
        <i />
      </label>
      <label className="lp2-cmotion__field is-2">
        <span>Sponsor name</span>
        <i />
      </label>
      <label className="lp2-cmotion__field is-3">
        <span>Embassy city</span>
        <i className="is-select" />
      </label>
    </div>
  )
}
