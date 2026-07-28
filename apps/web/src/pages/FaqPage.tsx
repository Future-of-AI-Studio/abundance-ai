import { useState } from 'react';
import { LegalLayout } from '@/pages/legal/LegalLayout';
import { FAQS } from '@/data/faqs';

// Public Frequently Asked Questions page — linked from the landing footer.
// Reuses the legal/policy shell (nav + "Back to Home" + footer) and renders
// the same FAQ list shown in the in-app Guidance page as a simple accordion.

const CSS = `
.faq-list { display:flex; flex-direction:column; gap:12px; }
.faq-item { border:1px solid rgba(34,41,61,0.12); border-radius:14px; background:#FFFFFF; overflow:hidden; transition:border-color 160ms ease, box-shadow 160ms ease; }
.faq-item[data-open="true"] { border-color:rgba(245,156,48,0.45); box-shadow:0 8px 24px rgba(34,41,61,0.06); }
.faq-q { display:flex; align-items:center; justify-content:space-between; gap:16px; width:100%; padding:18px 20px; background:none; border:0; cursor:pointer; text-align:left; font-family:'Inter',system-ui,sans-serif; font-size:17px; font-weight:700; color:#22293D; }
.faq-q:hover { color:#E8932C; }
.faq-sign { flex:0 0 auto; width:22px; height:22px; position:relative; }
.faq-sign::before, .faq-sign::after { content:''; position:absolute; left:50%; top:50%; width:12px; height:2px; border-radius:2px; background:#F59C30; transform:translate(-50%,-50%); transition:transform 200ms ease, opacity 200ms ease; }
.faq-sign::after { transform:translate(-50%,-50%) rotate(90deg); }
.faq-item[data-open="true"] .faq-sign::after { opacity:0; transform:translate(-50%,-50%) rotate(0deg); }
.faq-a { padding:0 20px 20px; margin:0; font-size:16px; line-height:1.7; color:#3A4152; white-space:pre-line; }
`;

export function FaqPage() {
  const [open, setOpen] = useState(-1);

  return (
    <LegalLayout title="Frequently Asked Questions">
      <style>{CSS}</style>
      <p style={{ marginTop: 4 }}>
        Answers to the questions creators ask most often about building and launching a program
        with AbundanceAI.
      </p>
      <div className="faq-list" style={{ marginTop: 28 }}>
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q} className="faq-item" data-open={isOpen}>
              <button
                type="button"
                className="faq-q"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? -1 : i)}
              >
                <span>{f.q}</span>
                <span className="faq-sign" aria-hidden="true" />
              </button>
              {isOpen && <p className="faq-a">{f.a}</p>}
            </div>
          );
        })}
      </div>
    </LegalLayout>
  );
}
