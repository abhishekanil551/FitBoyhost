const nodemailer = require('nodemailer');

// Initialize Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD
  }
});

// Helper to escape HTML special characters
const escapeHtml = (str) => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const sendInvoiceEmail = async (user, order, pdfBuffer) => {
  const mailOptions = {
    from: process.env.NODEMAILER_EMAIL,
    to: user.email,
    subject: `Your Fitboy Games Order Confirmation - ${escapeHtml(order.orderNumber)}`,
    html: `
      <h2>Thank You for Your Purchase!</h2>
      <p>Dear ${escapeHtml(user.name)},</p>
      <p>We’re thrilled to confirm your order with Fitboy Games! Below are the details of your purchase:</p>
      <h3>Order Details</h3>
      <p><strong>Order Number:</strong> ${escapeHtml(order.orderNumber)}</p>
      <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p><strong>Total:</strong> ₹${order.total.toFixed(2)}</p>
      <h3>Games Purchased</h3>
      <ul>
        ${order.order_items.map(item => `
          <li>
            <strong>${escapeHtml(item.productId.name)}</strong> - ₹${item.price.toFixed(2)}<br>
            Description: ${escapeHtml(item.productId.description || 'N/A')}<br>
            System Requirements: ${escapeHtml(item.productId.systemRequirements || 'N/A')}
          </li>
        `).join('')}
      </ul>
      <p>Please find your invoice attached. We hope you enjoy your games! If you have any questions, feel free to contact us at fitboy55551@gmail.com.</p>
      <p>Best regards,<br>The Fitboy Games Team</p>
    `,
    attachments: [
      {
        filename: `invoice-${order.orderNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Invoice email sent successfully to ${user.email} for order ${order.orderNumber}`);
  } catch (error) {
    console.error(`Error sending invoice email to ${user.email}:`, error);
    throw new Error('Failed to send invoice email');
  }
};

module.exports = { sendInvoiceEmail };