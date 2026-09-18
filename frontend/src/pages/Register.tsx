import React, { FormEvent, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { register } from "../lib/api";

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [accountType, setAccountType] = useState("Savings");
  const [initialBalance, setInitialBalance] = useState("10000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successAccountInfo, setSuccessAccountInfo] = useState<{ id: string; mask: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await register(
        fullName.trim(),
        email.trim(),
        phoneNumber.trim(),
        dateOfBirth,
        address.trim(),
        accountType,
        parseFloat(initialBalance) || 0
      );

      setSuccessAccountInfo({ id: response.account_id || response.masked_account, mask: response.masked_account });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
            <img src="/app-image.png" alt="KAUTILYA BANK" className="h-full w-full object-cover" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">KAUTILYA BANK</h1>
          <p className="mt-2 text-sm text-slate-500">Create an Account</p>
        </div>

        {successAccountInfo ? (
          <div className="text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Account Created!</h2>
              <p className="mt-2 text-sm text-slate-600">Your new account has been generated successfully.</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Account ID</p>
              <p className="mt-1 text-lg font-mono font-bold text-slate-900">{successAccountInfo.id}</p>
            </div>
            <button
              onClick={() => {
                const state = location.state as { from?: string } | null;
                navigate(state?.from || "/", { replace: true });
              }}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-800"
            >
              Continue to Dashboard
            </button>
          </div>
        ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-slate-700">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="e.g. Ananya Rao"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="e.g. ananya.rao@example.com"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            <div>
              <label htmlFor="phoneNumber" className="mb-2 block text-sm font-medium text-slate-700">
                Phone number
              </label>
              <input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                placeholder="e.g. +919876540001"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="dateOfBirth" className="mb-2 block text-sm font-medium text-slate-700">
                  Date of birth
                </label>
                <input
                  id="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="address" className="mb-2 block text-sm font-medium text-slate-700">
                Address
              </label>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                placeholder="e.g. 123 Main St, Bangalore"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="accountType" className="mb-2 block text-sm font-medium text-slate-700">
                  Account Type
                </label>
                <select
                  id="accountType"
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 bg-white"
                >
                  <option value="Savings">Savings</option>
                  <option value="Checking">Checking</option>
                  <option value="Current">Current</option>
                </select>
              </div>
              <div>
                <label htmlFor="initialBalance" className="mb-2 block text-sm font-medium text-slate-700">
                  Initial Balance
                </label>
                <input
                  id="initialBalance"
                  type="number"
                  min="0"
                  step="0.01"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
            </div>

            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Registering..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-slate-900 hover:underline">
              Sign in
            </Link>
          </p>
        </>
        )}
      </section>
    </main>
  );
}
