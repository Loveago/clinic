'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, User, ArrowRight, Clock, Heart } from 'lucide-react';
import ClinicNavbar from '@/components/ClinicNavbar';
import ClinicFooter from '@/components/ClinicFooter';

export default function ClinicNewsPage() {
  const articles = [
    {
      id: 1,
      title: 'Managing Hypertension: Practical Lifestyle Modifications for Urban Professionals',
      excerpt: 'Essential dietary shifts, sodium reduction guidelines, and daily physical activity goals to keep systolic pressure below 120 mmHg.',
      author: 'Dr. Amina Bello, FWACP',
      date: 'Apr 24, 2025',
      readTime: '4 min read',
      category: 'Preventive Wellness',
      image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&auto=format&fit=crop&q=80',
    },
    {
      id: 2,
      title: 'Pediatric Immunization: Protecting Your Newborn from Vaccine-Preventable Diseases',
      excerpt: 'A comprehensive timetable of essential vaccines from BCG at birth through measles and pentavalent booster doses.',
      author: 'Dr. Sarah Johnson, FMCPaed',
      date: 'Apr 19, 2025',
      readTime: '6 min read',
      category: 'Child Health',
      image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80',
    },
    {
      id: 3,
      title: 'When to Visit Emergency: Recognizing Early Symptoms of Stroke and Cardiac Distress',
      excerpt: 'The F.A.S.T. acronym and critical clinical signs that require immediate paramedic or emergency room admission.',
      author: 'Dr. Emeka Okafor, FWACS',
      date: 'Apr 12, 2025',
      readTime: '5 min read',
      category: 'Emergency Care',
      image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9]">
      <ClinicNavbar />

      <section className="bg-[#073832] text-white py-14 px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
          Health Insights &amp; Clinical Advisories
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          News &amp; Health Articles
        </h1>
        <p className="text-sm sm:text-base text-emerald-100/80 max-w-2xl mx-auto">
          Medical guidance written by our consulting doctors to help you make informed decisions for your family.
        </p>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {articles.map((art) => (
            <article
              key={art.id}
              className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-md hover:shadow-xl hover:border-emerald-300 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="relative h-52 w-full bg-slate-100 overflow-hidden">
                  <Image
                    src={art.image}
                    alt={art.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-[#073832] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {art.category}
                  </div>
                </div>

                <div className="p-6 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{art.date}</span>
                    <span>•</span>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{art.readTime}</span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-800 transition-colors leading-snug">
                    {art.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {art.excerpt}
                  </p>
                </div>
              </div>

              <div className="p-6 pt-0 border-t border-slate-100 flex items-center justify-between mt-4">
                <span className="text-[11px] font-bold text-slate-700">{art.author}</span>
                <span className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1">
                  <span>Read Article</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </article>
          ))}
        </div>
      </main>

      <ClinicFooter />
    </div>
  );
}

