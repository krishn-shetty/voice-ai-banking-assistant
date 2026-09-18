import React, {
  FormEvent,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { login } from "../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] =
    useState("");

  const [phoneNumber, setPhoneNumber] =
    useState("");

  const [dateOfBirth, setDateOfBirth] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await login(
        email.trim(),
        phoneNumber.trim(),
        dateOfBirth,
      );

      const state =
        location.state as
          | {
              from?: string;
            }
          | null;

      const destination =
        state?.from || "/";

      navigate(
        destination,
        {
          replace: true,
        },
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to authenticate.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">

      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">

        {/* ================================================================ */}
        {/* BRAND                                                            */}
        {/* ================================================================ */}

        <div className="mb-8 text-center">

          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-xl font-semibold text-white">
            K
          </div>

          <h1 className="text-2xl font-semibold text-slate-900">
            Kubera
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            AI Voice Banking Assistant
          </p>

        </div>

        {/* ================================================================ */}
        {/* FORM                                                             */}
        {/* ================================================================ */}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >

          {/* EMAIL */}

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
              autoComplete="email"
              placeholder="Enter your email"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          {/* PHONE */}

          <div>
            <label
              htmlFor="phoneNumber"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Phone number
            </label>

            <input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(event) =>
                setPhoneNumber(
                  event.target.value,
                )
              }
              required
              autoComplete="tel"
              placeholder="Enter your phone number"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          {/* DOB */}

          <div>
            <label
              htmlFor="dateOfBirth"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Date of birth
            </label>

            <input
              id="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(event) =>
                setDateOfBirth(
                  event.target.value,
                )
              }
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          {/* ERROR */}

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Signing in..."
              : "Continue"}
          </button>

        </form>

        {/* FOOTER */}

        <p className="mt-6 text-center text-xs text-slate-400">
          Demo banking environment
        </p>

      </section>

    </main>
  );
}