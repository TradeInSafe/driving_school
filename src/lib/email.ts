import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

export async function sendBookingConfirmationEmail({
    studentEmail,
    studentName,
    instructorEmail,
    instructorName,
    lessonTitle,
    startTime,
    pickupAddress,
    transmissionType,
    creditsRemaining
}: {
    studentEmail: string
    studentName: string
    instructorEmail?: string
    instructorName?: string
    lessonTitle: string
    startTime: string
    pickupAddress: string
    transmissionType: string
    creditsRemaining?: number
}) {
    if (!process.env.RESEND_API_KEY) {
        console.log('[EMAIL SIMULATED] Booking Confirmed for', studentEmail)
        return
    }

    const dateStr = new Date(startTime).toLocaleString('en-AU', {
        dateStyle: 'full',
        timeStyle: 'short'
    })

    // 1. Send to Student
    try {
        await resend.emails.send({
            from: fromEmail,
            to: studentEmail,
            subject: 'Lesson Booking Confirmed - Brisbane Bayside Driving School',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; line-height: 1.6;">
                    <h2 style="color: #0047AB;">Your lesson is booked! 🎉</h2>
                    <p>Hi ${studentName},</p>
                    <p>This is a confirmation that your driving lesson for <strong>${lessonTitle}</strong> has been successfully scheduled.</p>
                    
                    <div style="background-color: #f3f4f6; padding: 25px; border-radius: 16px; margin: 25px 0; border: 1px solid #e5e7eb;">
                        <h3 style="margin-top: 0; color: #0047AB; font-size: 18px;">Lesson Details:</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #666; width: 100px;">📅 Date & Time:</td>
                                <td style="padding: 8px 0; font-weight: bold;">${dateStr}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666;">👨‍🏫 Instructor:</td>
                                <td style="padding: 8px 0; font-weight: bold;">${instructorName || 'Assigned Instructor'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666;">📍 Pickup:</td>
                                <td style="padding: 8px 0; font-weight: bold;">${pickupAddress}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #666;">⚙️ Transmission:</td>
                                <td style="padding: 8px 0; font-weight: bold; text-transform: capitalize;">${transmissionType}</td>
                            </tr>
                            ${creditsRemaining !== undefined ? `
                            <tr>
                                <td style="padding: 8px 0; color: #666;">🎟️ Credits:</td>
                                <td style="padding: 8px 0; font-weight: bold; color: #0047AB;">${creditsRemaining} remaining</td>
                            </tr>
                            ` : ''}
                        </table>
                    </div>
                    
                    <p style="font-size: 14px; color: #666; background: #fffbeb; padding: 15px; border-radius: 8px; border: 1px solid #fef3c7;">
                        <strong>Need to reschedule?</strong> Please contact your instructor ${instructorName ? `(${instructorName}) ` : ''}directly at least 24 hours in advance to avoid a cancellation fee.
                    </p>
                    
                    <p>Happy driving!<br><strong>Brisbane Bayside Driving School</strong></p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                    <p style="font-size: 12px; color: #999; text-align: center;">Brisbane, QLD, Australia</p>
                </div>
            `
        })
    } catch (err) {
        console.error('Failed to send email to student:', err)
    }

    // 2. Send to Instructor
    if (instructorEmail) {
        try {
            await resend.emails.send({
                from: fromEmail,
                to: instructorEmail,
                subject: `New Booking: ${studentName} - ${dateStr}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
                        <h2 style="color: #0047AB;">New Lesson Booking 🚗</h2>
                        <p>Hi ${instructorName},</p>
                        <p>You have a new booking from <strong>${studentName}</strong>.</p>
                        
                        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
                            <h3 style="margin-top: 0;">Booking Summary:</h3>
                            <ul style="list-style: none; padding: 0; margin: 0;">
                                <li style="margin-bottom: 8px;">👤 <strong>Student:</strong> ${studentName}</li>
                                <li style="margin-bottom: 8px;">📅 <strong>Time:</strong> ${dateStr}</li>
                                <li style="margin-bottom: 8px;">📍 <strong>Pickup:</strong> ${pickupAddress}</li>
                                <li style="margin-bottom: 8px;">⚙️ <strong>Transmission:</strong> ${transmissionType}</li>
                                <li style="margin-bottom: 8px;">📝 <strong>Lesson:</strong> ${lessonTitle}</li>
                            </ul>
                        </div>
                        
                        <p>Please check your instructor dashboard for more details and to manage your schedule.</p>
                        <p>Best regards,<br><strong>System Notification</strong></p>
                    </div>
                `
            })
        } catch (err) {
            console.error('Failed to send email to instructor:', err)
        }
    }
}

export async function sendPackagePurchaseEmail({
    studentEmail,
    studentName,
    packageName,
    amount,
    creditsAdded
}: {
    studentEmail: string
    studentName: string
    packageName: string
    amount: number
    creditsAdded: number
}) {
    if (!process.env.RESEND_API_KEY) {
        console.log('[EMAIL SIMULATED] Package Purchased by', studentEmail)
        return
    }

    try {
        await resend.emails.send({
            from: fromEmail,
            to: studentEmail,
            subject: 'Lesson Package Purchased - Brisbane Bayside Driving School',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
                    <h2 style="color: #0047AB;">Thank you for your purchase! 🎓</h2>
                    <p>Hi ${studentName},</p>
                    <p>Your driving lesson package has been successfully processed. You can now start booking your lessons.</p>
                    
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e5e7eb;">
                        <ul style="list-style: none; padding: 0; margin: 0;">
                            <li style="margin-bottom: 8px;">📦 <strong>Package:</strong> ${packageName}</li>
                            <li style="margin-bottom: 8px;">💰 <strong>Amount:</strong> $${amount}</li>
                            <li style="margin-bottom: 8px;">🎟️ <strong>Credits Added:</strong> <span style="font-weight: bold; color: #0047AB;">+${creditsAdded}</span></li>
                        </ul>
                    </div>
                    
                    <p>Available credits are now visible in your dashboard. These credits are valid for 90 days.</p>
                    <p>Thanks,<br><strong>Brisbane Bayside Driving School</strong></p>
                </div>
            `
        })
    } catch (err) {
        console.error('Failed to send package email:', err)
    }
}
