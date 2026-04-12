import nodemailer from 'nodemailer'

const FROM = 'Brisbane Bayside Driving School <brisbanebaysidedrivingschool@gmail.com>'

function getTransporter() {
    const user = process.env.GMAIL_USER
    const pass = process.env.GMAIL_APP_PASSWORD
    if (!user || !pass) throw new Error('GMAIL_USER or GMAIL_APP_PASSWORD is not set')
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // TLS
        auth: { user, pass },
    })
}

async function sendMail(to: string, subject: string, html: string) {
    if (!process.env.GMAIL_APP_PASSWORD) {
        console.log(`[EMAIL SIMULATED] To: ${to} | Subject: ${subject}`)
        return
    }
    await getTransporter().sendMail({ from: FROM, to, subject, html })
}

export async function sendBookingConfirmationEmail({
    studentEmail,
    studentName,
    instructorEmail,
    instructorName,
    lessonTitle,
    startTime,
    pickupAddress,
    transmissionType,
}: {
    studentEmail: string
    studentName: string
    instructorEmail?: string
    instructorName?: string
    lessonTitle: string
    startTime: string
    pickupAddress: string
    transmissionType: string
}) {
    const dateStr = new Date(startTime).toLocaleString('en-AU', {
        dateStyle: 'full',
        timeStyle: 'short',
    })

    // 1. Send to Student
    try {
        await sendMail(
            studentEmail,
            'Lesson Booking Confirmed - Brisbane Bayside Driving School',
            `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; line-height: 1.6;">
                <h2 style="color: #0047AB;">Your lesson is booked! 🎉</h2>
                <p>Hi ${studentName},</p>
                <p>This is a confirmation that your driving lesson for <strong>${lessonTitle}</strong> has been successfully scheduled.</p>

                <div style="background-color: #f3f4f6; padding: 25px; border-radius: 16px; margin: 25px 0; border: 1px solid #e5e7eb;">
                    <h3 style="margin-top: 0; color: #0047AB; font-size: 18px;">Lesson Details:</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #666; width: 120px;">📅 Date & Time:</td>
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
                    </table>
                </div>

                <p style="font-size: 14px; color: #666; background: #fffbeb; padding: 15px; border-radius: 8px; border: 1px solid #fef3c7;">
                    <strong>Need to reschedule?</strong> Please contact your instructor ${instructorName ? `(${instructorName}) ` : ''}directly at least 24 hours in advance to avoid a cancellation fee.
                </p>

                <p>Happy driving!<br><strong>Brisbane Bayside Driving School</strong></p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                <p style="font-size: 12px; color: #999; text-align: center;">Brisbane, QLD, Australia &nbsp;·&nbsp; 0470 252 770</p>
            </div>
            `
        )
    } catch (err) {
        console.error('Failed to send booking confirmation to student:', err)
    }

    // 2. Send to Instructor
    if (instructorEmail) {
        try {
            await sendMail(
                instructorEmail,
                `New Booking: ${studentName} - ${dateStr}`,
                `
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
                            <li style="margin-bottom: 8px;">📝 <strong>Lesson:</strong> ${lessonTitle}</li>
                        </ul>
                    </div>

                    <p>Best regards,<br><strong>Brisbane Bayside Driving School</strong></p>
                </div>
                `
            )
        } catch (err) {
            console.error('Failed to send booking notification to instructor:', err)
        }
    }
}

export async function sendWelcomeEmail({
    studentEmail,
    studentName,
}: {
    studentEmail: string
    studentName: string
}) {
    try {
        await sendMail(
            studentEmail,
            'Welcome to Brisbane Bayside Driving School! 🚗',
            `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; line-height: 1.6;">
                <h2 style="color: #0047AB;">Welcome, ${studentName}! 🎉</h2>
                <p>Thanks for creating an account with <strong>Brisbane Bayside Driving School</strong>. We're excited to have you on board!</p>

                <div style="background-color: #f3f4f6; padding: 25px; border-radius: 16px; margin: 25px 0; border: 1px solid #e5e7eb;">
                    <h3 style="margin-top: 0; color: #0047AB; font-size: 18px;">What's next?</h3>
                    <ul style="padding-left: 20px; margin: 0; color: #444;">
                        <li style="margin-bottom: 10px;">Browse our <strong>lesson packages</strong> to find the right fit for you</li>
                        <li style="margin-bottom: 10px;">Book your <strong>first lesson</strong> online in just a few clicks</li>
                        <li style="margin-bottom: 10px;">Track your upcoming sessions from your <strong>dashboard</strong></li>
                    </ul>
                </div>

                <p>If you have any questions, feel free to get in touch with us. We're here to help you become a confident and safe driver.</p>

                <p>See you on the road!<br><strong>Brisbane Bayside Driving School</strong></p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                <p style="font-size: 12px; color: #999; text-align: center;">Brisbane, QLD, Australia &nbsp;·&nbsp; 0470 252 770</p>
            </div>
            `
        )
    } catch (err) {
        console.error('Failed to send welcome email:', err)
    }
}
