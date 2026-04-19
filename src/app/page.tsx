'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle2, Star, Shield, Clock, Users, Calendar, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function Home() {
  return (
    <div className="flex flex-col gap-20 pb-20">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-transparent z-10" />
          <Image
            src="/brisbane_driving_car.jpeg"
            alt="Brisbane Bayside Driving School car"
            fill
            className="object-contain"
            priority
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 w-full">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-3xl space-y-8"
          >
            <div className="inline-flex items-center gap-2 bg-secondary/20 border border-secondary/30 px-4 py-2 rounded-full backdrop-blur-sm">
              <Star className="w-4 h-4 text-secondary fill-secondary" />
              <span className="text-secondary font-semibold text-sm tracking-wide uppercase">Top Rated in Brisbane</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight font-outfit">
              Brisbane's Leading <span className="text-secondary italic">Car & Heavy Vehicle</span> Driving School
            </h1>

            <p className="text-xl text-primary-foreground/90 leading-relaxed font-medium">
              Brisbane Bayside Driving School delivers a comprehensive range of standard Car (C Class) and Heavy Vehicle Driving Courses, including One-Day and Package Training for HR and MR vehicles.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/book">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto gap-2">
                  Book First Lesson <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/lessons">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-white border-white/30 hover:bg-white/10 hover:border-white">
                  View Packages
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-8 pt-8 border-t border-white/10">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-primary bg-muted overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" />
                  </div>
                ))}
              </div>
              <div className="flex flex-col">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 text-secondary fill-secondary" />
                  ))}
                </div>
                <p className="text-sm text-white/70">Trusted by <span className="text-white font-bold">500+</span> Local Students</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-accent font-bold tracking-widest uppercase text-sm">Our Services</h2>
          <p className="text-4xl md:text-5xl font-bold font-outfit">Comprehensive Learning Solutions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <Shield className="w-8 h-8 text-accent" />,
              title: "Safety First",
              desc: "Dual-controlled vehicles and advanced safety modules ensure a secure environment for every lesson."
            },
            {
              icon: <Clock className="w-8 h-8 text-accent" />,
              title: "Flexible Scheduling",
              desc: "Book, reschedule, or cancel lessons with ease through our intuitive student dashboard."
            },
            {
              icon: <Users className="w-8 h-8 text-accent" />,
              title: "Expert Instructors",
              desc: "Learn from patient, certified professionals with years of experience in local road regulations."
            }
          ].map((service, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -10 }}
              className="p-8 bg-card border border-border rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300"
            >
              <div className="bg-muted w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                {service.icon}
              </div>
              <h3 className="text-xl font-bold mb-4">{service.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {service.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials Preview */}
      <section className="bg-primary py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 space-y-8">
              <h2 className="text-secondary font-bold tracking-widest uppercase text-sm">Testimonials</h2>
              <p className="text-4xl md:text-5xl font-bold text-white font-outfit leading-tight">
                See Why We Are Brisbane's <span className="text-secondary italic">Preferred</span> Choice
              </p>
              <div className="flex items-center gap-6 bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
                <div className="text-4xl font-bold text-white">4.9</div>
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-4 h-4 text-secondary fill-secondary" />
                    ))}
                  </div>
                  <p className="text-white/60 text-sm">Average rating from 200+ Google Reviews</p>
                </div>
              </div>
              <Link href="/testimonials">
                <Button variant="outline" className="text-white border-white/20 hover:bg-white/10">Read All Reviews</Button>
              </Link>
            </div>

            <div className="lg:w-1/2 relative">
              <div className="grid grid-cols-1 gap-6">
                {[
                  {
                    name: "Danielle M.",
                    role: "Passed First Attempt",
                    comment: "I was really nervous about learning to drive but my instructor made me feel completely at ease from the very first lesson. He was patient, encouraging and explained everything so clearly. I passed my test first go and couldn't be happier. Highly recommend Brisbane Bayside Driving School!"
                  },
                  {
                    name: "Liam T.",
                    role: "Student",
                    comment: "Fantastic driving school! The online booking system made it so easy to schedule lessons around my work. My instructor was professional and always on time. I felt confident behind the wheel after just a few sessions. 5 stars without a doubt!"
                  }
                ].map((testimonial, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 100 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.2 }}
                    className="bg-white p-8 rounded-2xl shadow-2xl relative"
                  >
                    <p className="text-primary/80 italic mb-6 leading-relaxed">"{testimonial.comment}"</p>
                    <div className="flex flex-col">
                      <span className="font-bold text-primary">{testimonial.name}</span>
                      <span className="text-accent text-sm font-medium">{testimonial.role}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="bg-secondary rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/20 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/10 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />

          <div className="relative z-10 max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-6xl font-bold font-outfit text-primary">Ready to Start Your Journey?</h2>
            <p className="text-xl text-primary/70">Join hundreds of successful drivers. Book your intro lesson today for just $49.</p>
            <Link href="/book">
              <Button size="lg" className="bg-primary text-white hover:bg-primary/90 px-12 py-8 text-xl rounded-2xl">
                Book Your Intro Lesson Now
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
