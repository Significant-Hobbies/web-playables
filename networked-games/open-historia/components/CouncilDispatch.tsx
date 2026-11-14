interface CouncilDispatchProps {
  narrative: string | null;
  urgent: boolean;
  onOrders: () => void;
  onAdvisor: () => void;
}

export function CouncilPortrait({ role }: { role: 'envoy' | 'marshal' | 'chronicler' }) {
  const marshal = role === 'marshal';
  const chronicler = role === 'chronicler';
  return (
    <svg
      viewBox="0 0 100 120"
      aria-hidden="true"
      className={`council-portrait council-portrait--${role}`}
    >
      <path d="M0 0h100v120H0z" fill="#152536" />
      <path d="M12 120v-16q2-25 27-29h22q27 4 28 29v16" fill={marshal ? '#45594f' : '#46566e'} />
      <path d="m36 78 14 27 14-27-14 10z" fill="#d9d3bf" />
      <path d="M43 62h15v26H43z" fill="#bd8b69" />
      <path
        d="M29 35q0-25 23-25 25 0 23 27l-4 22q-5 18-21 18-15-3-20-18z"
        fill={chronicler ? '#dfb394' : '#c99573'}
      />
      <path
        d={
          marshal
            ? 'M27 36V24q24-24 49 0l-2 13-9-11-34 14z'
            : chronicler
              ? 'M26 50V29q2-24 25-23 26-1 26 29v32l-12-4V29L34 45v21l-10 8z'
              : 'M27 39q-7-34 26-33 30 1 24 33l-16-17-29 18z'
        }
        fill={chronicler ? '#b7b1a6' : '#302e30'}
      />
      <g className="council-eyes" fill="#273443">
        <path d="M36 44h9v3h-9zM57 44h9v3h-9z" />
      </g>
      {chronicler && (
        <g stroke="#534c45" fill="none" strokeWidth="2">
          <circle cx="40" cy="46" r="8" />
          <circle cx="61" cy="46" r="8" />
          <path d="M48 46h5" />
        </g>
      )}
      <path d="m51 46-3 12h6M42 63q9 5 17-1" fill="none" stroke="#8b5e4d" strokeWidth="2" />
      {marshal && (
        <g fill="#d6b368">
          <path d="m22 87 7 9 7-9M66 87l7 9 7-9" />
          <circle cx="70" cy="108" r="4" />
        </g>
      )}
      <path d="M17 119v-15M84 119v-15" stroke="#b8c0c2" opacity=".25" />
    </svg>
  );
}

export default function CouncilDispatch({
  narrative,
  urgent,
  onOrders,
  onAdvisor,
}: CouncilDispatchProps) {
  const role = urgent ? 'marshal' : narrative ? 'chronicler' : 'envoy';
  const speaker = urgent
    ? 'Soren · operations'
    : narrative
      ? 'Inez · the chronicle'
      : 'Mara · foreign affairs';
  return (
    <aside
      className={`council-dispatch ${urgent ? 'council-dispatch--urgent' : ''}`}
      aria-label="Your council"
    >
      <div className="council-speaker">
        <CouncilPortrait role={role} />
        <div>
          <span>{narrative ? 'Dispatch from the field' : 'Before the first decision'}</span>
          <strong>{speaker}</strong>
          <small>Your fictional council</small>
        </div>
      </div>
      <p key={narrative ?? 'opening'} className="council-narrative">
        {narrative ??
          'A map tells you where we stand. Your first order will tell us who we are. Choose a response; we will bring you its consequences.'}
      </p>
      <div className="council-actions">
        <button type="button" onClick={onOrders}>
          {narrative ? 'Issue the next order' : 'Give the first order'}
        </button>
        <button type="button" onClick={onAdvisor}>
          Consult the council
        </button>
      </div>
    </aside>
  );
}
