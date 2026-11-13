import React from 'react';
import { MapPin, Phone, Mail } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { BrandMark } from './BrandMark.tsx';

export function Footer() {
  const { settings, navigate } = useApp();

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 no-print">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-12 pb-20 lg:pb-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <BrandMark size={36} logoUrl={settings.logoUrl} light />
              <span className="font-bold text-white tracking-tight">{settings.instituteName}</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              {settings.tagline} Dedicated coaching for Class 11, Class 12 (CBSE &amp; Bihar Board), NEET &amp; IIT-JEE Chemistry under Prof. {settings.directorName}.
            </p>
            <p className="text-xs text-slate-500">Station Road / Chandmari, Motihari, Bihar</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Learning Hub</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button type="button" onClick={() => navigate('/courses')} className="hover:text-white transition-colors">
                  Chemistry Courses
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/batches')} className="hover:text-white transition-colors">
                  Power Batches &amp; Timings
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/online-classes')} className="hover:text-white transition-colors">
                  Online Live Classes
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/study')} className="hover:text-white transition-colors">
                  Study Notes &amp; Lectures
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/tests')} className="hover:text-white transition-colors">
                  Test Series &amp; MCQs
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/results')} className="hover:text-white transition-colors">
                  Toppers &amp; Results
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Portals &amp; Admissions</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button type="button" onClick={() => navigate('/admissions')} className="hover:text-white transition-colors">
                  Online Admission Form
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/admission-status')} className="hover:text-white transition-colors">
                  Check Admission Status
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/student-login')} className="hover:text-white transition-colors">
                  Student &amp; Staff Login
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/about')} className="hover:text-white transition-colors">
                  About Institute &amp; Faculty
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/gallery')} className="hover:text-white transition-colors">
                  Campus Gallery
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Motihari Campus</h3>
            <div className="space-y-3 text-sm text-slate-400">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>{settings.address}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-sky-400 shrink-0" />
                <a href={`tel:${settings.phone}`} className="hover:text-white transition-colors tabular-nums">
                  {settings.phone}
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-sky-400 shrink-0" />
                <a href={`mailto:${settings.email}`} className="hover:text-white transition-colors">
                  {settings.email}
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} THE ZONE OF CHEMISTRY · Motihari, Bihar. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <button type="button" onClick={() => navigate('/privacy-policy')} className="hover:text-slate-300">
              Privacy Policy
            </button>
            <button type="button" onClick={() => navigate('/terms')} className="hover:text-slate-300">
              Terms &amp; Conditions
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
