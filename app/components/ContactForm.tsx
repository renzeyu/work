"use client";

import { FormEvent, useState } from "react";

const contactEmail = "hello@zeyuren.com";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();
    const subject = encodeURIComponent(`Portfolio message from ${name}`);
    const body = encodeURIComponent(`${message}\n\nFrom: ${name}\nEmail: ${email}`);

    setSubmitted(true);
    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
  }

  return (
    <form
      className="contact-form"
      aria-label="Contact Zeyu Ren"
      aria-describedby="contact-form-note"
      onSubmit={handleSubmit}
    >
      <p id="contact-form-note" className="sr-only">
        Send a note. Submitting opens your email app.
      </p>
      <div className="form-field">
        <label htmlFor="contact-name">Name *</label>
        <input
          id="contact-name"
          name="name"
          type="text"
          placeholder="Your Name..."
          autoComplete="name"
          required
        />
      </div>
      <div className="form-field">
        <label htmlFor="contact-email">Email Address *</label>
        <input
          id="contact-email"
          name="email"
          type="email"
          placeholder="Your Email Address..."
          autoComplete="email"
          required
        />
      </div>
      <div className="form-field">
        <label htmlFor="contact-message">Message *</label>
        <textarea
          id="contact-message"
          name="message"
          placeholder="Your Message..."
          rows={7}
          required
        />
      </div>
      <button className="submit-button" type="submit">
        Submit
      </button>
      <p className="form-status" aria-live="polite">
        {submitted ? "Your email draft should now be open." : ""}
      </p>
    </form>
  );
}
