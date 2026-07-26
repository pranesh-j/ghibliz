"use client"

import React, { useState, useEffect, Suspense } from "react"
import { CloudBackground } from "@/components/cloud-background"
import { GhibliLogo } from "@/components/ghibli-logo"
import { ArrowLeft } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Footer } from "@/components/footer"
import Link from "next/link"

function PoliciesContent() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'refund'>('privacy')
  
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'terms') {
      setActiveTab('terms')
    } else if (tab === 'refund') {
      setActiveTab('refund')
    } else {
      setActiveTab('privacy')
    }
  }, [searchParams])

  return (
    <>
      {/* Policy Navigation Tabs */}
      <div className="flex border-b border-amber-100 mb-6">
        <button 
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'privacy' ? 'text-amber-600 border-b-2 border-amber-500' : 'text-ghibli-dark/70 hover:text-ghibli-dark'}`}
          onClick={() => setActiveTab('privacy')}
        >
          Privacy Policy
        </button>
        <button 
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'terms' ? 'text-amber-600 border-b-2 border-amber-500' : 'text-ghibli-dark/70 hover:text-ghibli-dark'}`}
          onClick={() => setActiveTab('terms')}
        >
          Terms of Service
        </button>
        <button 
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'refund' ? 'text-amber-600 border-b-2 border-amber-500' : 'text-ghibli-dark/70 hover:text-ghibli-dark'}`}
          onClick={() => setActiveTab('refund')}
        >
          Refund Policy
        </button>
      </div>

      {/* Policy Content */}
      <div className="policy-content text-ghibli-dark/90 text-sm leading-relaxed">
        {activeTab === 'privacy' && (
          <div>
            <h2 className="text-xl font-playfair text-ghibli-dark mb-4">Privacy Policy</h2>
            <p className="mb-4">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            
            <div className="space-y-4">
              <section>
                <h3 className="font-medium text-base mb-2">Introduction</h3>
                <p>
                  Welcome to Ghiblit.art ("we," "our," or "us"). Ghiblit.art is owned and operated by an individual developer based in India. This Privacy Policy explains how we collect, use, and protect your information when you use our website and services.
                </p>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">Information We Collect</h3>
                <p>We collect the following types of information:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li><strong>Account Information:</strong> When you register, we collect your name, email address, and Google account information if you sign in with Google.</li>
                  <li><strong>Generated Images:</strong> We may store the AI-transformed images you create using our service.</li>
                  <li><strong>Payment Information:</strong> When you purchase credits, payment information is processed by our payment provider. We do not store your complete payment details.</li>
                  <li><strong>Usage Information:</strong> We collect information about how you interact with our service, including the number of transformations you create.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">How We Use Your Information</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>To provide and maintain our service</li>
                  <li>To process your payments and manage your account</li>
                  <li>To respond to your inquiries and provide customer support</li>
                  <li>To improve our services</li>
                  <li>To comply with legal obligations</li>
                </ul>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">Data Retention</h3>
                <p>
                  We retain your personal information for as long as necessary to provide you with our services. If you delete your account, we will delete or anonymize your personal information, though we may retain certain information for legal purposes or to prevent fraud.
                </p>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">Original Images</h3>
                <p>
                  We do not permanently store the original images you upload for transformation. These images are processed and then discarded.
                </p>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">Data Sharing</h3>
                <p>
                  We do not share your personal information with third parties except as necessary to provide our services (such as payment processing) or comply with legal obligations. We do not sell your data to advertisers or other third parties.
                </p>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">Third-Party Services</h3>
                <p>
                  Our service uses OpenAI's image transformation technology. Your use of our service is also subject to OpenAI's terms and policies. We recommend reviewing OpenAI's privacy policy for information on how they handle data.
                </p>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">Your Rights</h3>
                <p>
                  Depending on your location, you may have certain rights regarding your personal information, including the right to access, correct, or delete your data. To exercise these rights, please contact us at <a href="mailto:ghiblit.art@gmail.com" className="text-amber-600 hover:underline">ghiblit.art@gmail.com</a>.
                </p>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">Changes to this Policy</h3>
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
                </p>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">Contact Us</h3>
                <p>
                  If you have any questions about this Privacy Policy, please contact us at <a href="mailto:ghiblit.art@gmail.com" className="text-amber-600 hover:underline">ghiblit.art@gmail.com</a>.
                </p>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'terms' && (
          <div>
            <h2 className="text-xl font-playfair text-ghibli-dark mb-4">Terms of Service</h2>
            <p className="mb-4">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            
            <div className="space-y-4">
              <section>
                <h3 className="font-medium text-base mb-2">1. Acceptance of Terms</h3>
                <p>
                  By accessing or using Ghiblit.art, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use our service.
                </p>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">2. Service Description</h3>
                <p>
                  Ghiblit.art provides an AI-powered image transformation service that allows users to convert their photos into various artistic styles using artificial intelligence technology.
                </p>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">3. Account Registration</h3>
                <p>
                  To use our service, you may need to create an account. You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account.
                </p>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">4. Credits and Payments</h3>
                <p>
                  Our service operates on a credit system. Credits must be purchased to transform images. All purchases are final, subject to our Refund Policy. Credits do not expire, but we cannot guarantee indefinite service availability as this is an individual developer project.
                </p>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">5. User Content</h3>
                <p>
                  By uploading images to our service, you grant us the right to process these images for the purpose of providing our transformation service. You retain all rights to both your original images and the transformed results.
                </p>
                <p className="mt-2">
                  You must not upload images that:
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Contain illegal, harmful, or offensive content</li>
                  <li>Infringe on the intellectual property rights of others</li>
                  <li>Violate the privacy or publicity rights of others</li>
                  <li>Contain malware or other harmful code</li>
                </ul>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">6. Intellectual Property</h3>
                <p>
                  The Ghiblit.art service, including its design, logos, and software, is owned by us and protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works based on our service without our express permission.
                </p>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">7. Third-Party Services</h3>
                <p>
                  Our service uses technology from OpenAI and other third parties. Your use of our service is also subject to any applicable third-party terms and conditions.
                </p>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">8. Limitation of Liability</h3>
                <p>
                  Ghiblit.art is provided "as is" without any warranties, expressed or implied. We do not guarantee that our service will be uninterrupted, secure, or error-free. We are not liable for any indirect, incidental, special, consequential, or punitive damages.
                </p>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">9. Age Restrictions</h3>
                <p>
                  While we do not impose specific age restrictions, young children should use our service only with parental or guardian supervision.
                </p>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">10. Service Availability</h3>
                <p>
                  As Ghiblit.art is operated by an individual developer, we cannot guarantee continuous, uninterrupted, or secure access to our service. We reserve the right to suspend or terminate the service at any time.
                </p>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">11. Changes to Terms</h3>
                <p>
                  We may modify these Terms of Service at any time. Continued use of our service after any such changes constitutes your acceptance of the new Terms of Service.
                </p>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">12. Governing Law</h3>
                <p>
                  These Terms of Service are governed by the laws of India. Any disputes arising from your use of our service shall be subject to the exclusive jurisdiction of the courts in India.
                </p>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">13. Contact Information</h3>
                <p>
                  If you have any questions about these Terms of Service, please contact us at <a href="mailto:ghiblit.art@gmail.com" className="text-amber-600 hover:underline">ghiblit.art@gmail.com</a>.
                </p>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'refund' && (
          <div>
            <h2 className="text-xl font-playfair text-ghibli-dark mb-4">Refund Policy</h2>
            <p className="mb-4">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            
            <div className="space-y-4">
              <section>
                <h3 className="font-medium text-base mb-2">Refund Eligibility</h3>
                <p>
                  We strive to provide a quality service, but we understand that issues may arise. This Refund Policy outlines when and how you can request a refund for purchases made on Ghiblit.art.
                </p>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">Refund Timeframe</h3>
                <p>
                  You may request a refund within 7 days of your purchase. Refund requests submitted after this period will not be considered.
                </p>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">Eligible Refund Scenarios</h3>
                <p>We will issue refunds in the following cases:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li><strong>Unused Credits:</strong> If you have not used any of the credits from your purchase, you are eligible for a full refund.</li>
                  <li><strong>Technical Failures:</strong> If our service fails to deliver due to technical issues on our end and we cannot resolve the problem within a reasonable time.</li>
                  <li><strong>Double Charging:</strong> If you were charged multiple times for the same purchase.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">Non-Refundable Scenarios</h3>
                <p>We will not issue refunds in the following cases:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li><strong>Partial Credits Usage:</strong> Partial Credit usage cannot be refunded.</li>
                  <li><strong>Used Credits:</strong> Once credits have been used to transform images, they cannot be refunded.</li>
                  <li><strong>Image Quality Dissatisfaction:</strong> Due to the subjective nature of AI image transformations, we cannot offer refunds based on dissatisfaction with the artistic quality of transformed images.</li>
                  <li><strong>Improper Use:</strong> If you violated our Terms of Service.</li>
                  <li><strong>Change of Mind:</strong> Simple change of mind or no longer needing the service after using credits.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">Credit Expiration</h3>
                <p>
                  Credits purchased on Ghiblit.art do not expire. However, as an individual developer project, we cannot guarantee indefinite service availability. We encourage you to use your credits within a reasonable time.
                </p>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">How to Request a Refund</h3>
                <p>
                  To request a refund, please email us at <a href="mailto:ghiblit.art@gmail.com" className="text-amber-600 hover:underline">ghiblit.art@gmail.com</a> with the following information:
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Your account email address</li>
                  <li>Date of purchase</li>
                  <li>Amount paid</li>
                  <li>Reason for requesting a refund</li>
                  <li>Any relevant screenshots or information</li>
                </ul>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">Refund Processing</h3>
                <p>
                  We will review your refund request and respond within 3-5 business days. If approved, refunds will be processed to the original payment method used for the purchase. Processing times may vary depending on your payment provider.
                </p>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">Changes to this Policy</h3>
                <p>
                  We reserve the right to modify this Refund Policy at any time. Changes will be effective immediately upon posting to our website.
                </p>
              </section>

              <section>
                <h3 className="font-medium text-base mb-2">Contact Us</h3>
                <p>
                  If you have any questions about this Refund Policy, please contact us at <a href="mailto:ghiblit.art@gmail.com" className="text-amber-600 hover:underline">ghiblit.art@gmail.com</a>.
                </p>
              </section>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function PoliciesPage() {
  const router = useRouter()

  const handleBackClick = () => {
    router.push('/')
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <CloudBackground />
      
      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="pt-3 sm:pt-4 px-3 md:px-8">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <GhibliLogo />
          </div>
        </header>

        <div className="container mx-auto px-4 py-8 flex-grow">
          <button
            onClick={handleBackClick}
            className="flex items-center text-sm text-ghibli-dark mb-6 hover:text-ghibli-dark/80 transition-colors"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Home
          </button>

          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-playfair text-ghibli-dark mb-6 text-center">
              Ghiblit.art Policies
            </h1>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-8">
              <Suspense fallback={<div>Loading...</div>}>
                <PoliciesContent />
              </Suspense>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </main>
  )
}