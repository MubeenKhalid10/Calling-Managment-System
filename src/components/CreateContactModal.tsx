import React, { useState } from 'react';
import { useCallingSystem } from '../context/CallingSystemContext';
import { CallStatus } from '../types/crm';
import {
  X,
  UserPlus,
  Building,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Calendar,
  MessageSquare,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface CreateContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContactCreated?: (leadId: number, name: string) => void;
}

export const CreateContactModal: React.FC<CreateContactModalProps> = ({
  isOpen,
  onClose,
  onContactCreated,
}) => {
  const { callers, statuses, createContact } = useCallingSystem();

  // Form fields
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<CallStatus | string>('Not Called');
  const [assignedCaller, setAssignedCaller] = useState(callers[0] || 'Ali');
  const [nextCallDate, setNextCallDate] = useState('');
  const [notes, setNotes] = useState('');

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setCompany('');
    setPosition('');
    setPhoneNumber('');
    setEmail('');
    setLocation('');
    setStatus('Not Called');
    setAssignedCaller(callers[0] || 'Ali');
    setNextCallDate('');
    setNotes('');
    setErrorMessage(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Basic frontend validation
    if (!name.trim()) {
      setErrorMessage('Please enter the contact or prospect name.');
      return;
    }
    if (!company.trim()) {
      setErrorMessage('Please enter the company name.');
      return;
    }
    if (!phoneNumber.trim()) {
      setErrorMessage('Please enter a phone number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createContact({
        name: name.trim(),
        company: company.trim(),
        position: position.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim(),
        location: location.trim(),
        status,
        callerName: assignedCaller,
        nextCallDate: nextCallDate.trim(),
        notes: notes.trim(),
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Unable to save contact. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Success: Close and inform parent
      const newLead = result.lead;
      resetForm();
      setIsSubmitting(false);
      onClose();

      if (onContactCreated && newLead) {
        onContactCreated(newLead.leadId, newLead.clientName);
      }
    } catch (err) {
      console.error('Unexpected error creating contact:', err);
      setErrorMessage('Unable to save contact. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-snug">
                Add New Contact
              </h2>
              <p className="text-xs text-slate-500">
                Create a contact and save directly to the calling database
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Cannot Save Contact</span>
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-800 text-sm font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Row 1: Name & Company (Required) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Company Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Apex Dynamics Ltd"
                  disabled={isSubmitting}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Position & Phone Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Position / Job Title
              </label>
              <div className="relative">
                <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g. VP of Operations"
                  disabled={isSubmitting}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +1 555-234-5678"
                  disabled={isSubmitting}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Row 3: Email & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. s.jenkins@apexdynamics.com"
                  disabled={isSubmitting}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Location / Region
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Chicago, IL or United States"
                  disabled={isSubmitting}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Row 4: Status & Assigned Caller */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Initial Call Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Assigned Caller
              </label>
              <select
                value={assignedCaller}
                onChange={(e) => setAssignedCaller(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
              >
                {callers.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 5: Next Call Date */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Next Call Date (if scheduled)
            </label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={nextCallDate}
                onChange={(e) => setNextCallDate(e.target.value)}
                disabled={isSubmitting}
                className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
              />
            </div>
          </div>

          {/* Row 6: Notes / Comment */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Initial Notes / Call Comment
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Met at conference, requested pricing demo next Tuesday"
              disabled={isSubmitting}
              className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              If notes are provided, an initial call record will also be logged in Call History.
            </p>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm shadow-blue-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Contact...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Save Contact</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
