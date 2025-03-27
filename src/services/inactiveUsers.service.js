import { User } from "../models/user.model.js";
import transporter from "../config/nodemailer.js";
import mongoose from "mongoose";

/**
 * Service for handling inactive user notifications
 */
class InactiveUserService {
  /**
   * Defines how long a user must be inactive to be considered "inactive"
   * Default: 14 days (2 weeks)
   */
  static INACTIVITY_THRESHOLD_DAYS = 14;

  /**
   * Minimum days between notification emails to prevent spamming
   * Default: 7 days (1 week)
   */
  static MIN_DAYS_BETWEEN_NOTIFICATIONS = 7;

  /**
   * Batch size for processing users to prevent memory issues
   */
  static BATCH_SIZE = 50;

  /**
   * Find users who have been inactive for the specified period
   * and haven't received a notification recently
   * 
   * @returns {Promise<Array>} Array of inactive users
   */
  static async findInactiveUsers() {
    const inactivityThreshold = new Date();
    inactivityThreshold.setDate(inactivityThreshold.getDate() - this.INACTIVITY_THRESHOLD_DAYS);

    const notificationThreshold = new Date();
    notificationThreshold.setDate(notificationThreshold.getDate() - this.MIN_DAYS_BETWEEN_NOTIFICATIONS);

    // Find users who:
    // 1. Have been inactive for longer than the threshold
    // 2. Either never received a notification OR received one longer ago than the notification threshold
    // 3. Are not admins (we don't need to notify admins)
    return User.find({
      lastActive: { $lt: inactivityThreshold },
      $or: [
        { lastNotificationSent: null },
        { lastNotificationSent: { $lt: notificationThreshold } }
      ],
      isAdmin: false
    }).select('_id email firstName lastName lastActive');
  }

  /**
   * Process inactive users in batches to send notifications
   */
  static async processInactiveUsers() {
    try {
      const inactiveUsers = await this.findInactiveUsers();
      console.log(`Found ${inactiveUsers.length} inactive users to notify`);

      // Process users in batches
      for (let i = 0; i < inactiveUsers.length; i += this.BATCH_SIZE) {
        const batch = inactiveUsers.slice(i, i + this.BATCH_SIZE);
        await this.sendNotificationsBatch(batch);
        
        // Small delay between batches to prevent overloading the email server
        if (i + this.BATCH_SIZE < inactiveUsers.length) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      return { success: true, notifiedCount: inactiveUsers.length };
    } catch (error) {
      console.error("Error processing inactive users:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification emails to a batch of inactive users
   * 
   * @param {Array} users - Batch of inactive users to notify
   */
  static async sendNotificationsBatch(users) {
    const updateOperations = [];
    const emailPromises = [];

    for (const user of users) {
      // Prepare email content
      const emailData = await this.preparePersonalizedEmail(user);
      
      // Send email
      const emailPromise = transporter.sendMail({
        from: `"SSPM Community" <${process.env.EMAIL}>`,
        to: user.email,
        subject: emailData.subject,
        html: emailData.html
      });
      
      emailPromises.push(emailPromise);
      
      // Prepare database update
      updateOperations.push({
        updateOne: {
          filter: { _id: user._id },
          update: { lastNotificationSent: new Date() }
        }
      });
    }

    // Send all emails in parallel
    await Promise.all(emailPromises);
    
    // Update lastNotificationSent for all users in batch
    if (updateOperations.length > 0) {
      await User.bulkWrite(updateOperations);
    }
  }

  /**
   * Prepare personalized email content for an inactive user
   * 
   * @param {Object} user - User to prepare email for
   * @returns {Object} Email data including subject and HTML content
   */
  static async preparePersonalizedEmail(user) {
    // Calculate how many days the user has been inactive
    const daysInactive = Math.floor(
      (new Date() - new Date(user.lastActive)) / (1000 * 60 * 60 * 24)
    );

    // Get personalized content to show in the email
    const content = await this.getPersonalizedContent(user);

    const subject = `${user.firstName}, we miss you at SSPM Community!`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4a6cf7;">SSPM Community</h1>
        </div>
        
        <p>Hello ${user.firstName},</p>
        
        <p>We've noticed you haven't visited SSPM Community in the past ${daysInactive} days, and we miss having you around!</p>
        
        <h3 style="color: #4a6cf7; margin-top: 20px;">Here's what you've been missing:</h3>
        
        ${content.html}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CLIENT_URL}/login" style="background-color: #4a6cf7; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Return to SSPM Community
          </a>
        </div>
        
        <p>We hope to see you back soon!</p>
        
        <p>Best regards,<br>The SSPM Community Team</p>
        
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
          <p>If you no longer wish to receive these notifications, please update your email preferences in your account settings.</p>
        </div>
      </div>
    `;
    
    return { subject, html };
  }

  /**
   * Get personalized content to show in the email based on user profile
   * This could include new posts in groups they're part of, new connections,
   * opportunities matching their skills, etc.
   * 
   * @param {Object} user - User to get personalized content for
   * @returns {Object} Personalized content including HTML
   */
  static async getPersonalizedContent(user) {
    // This would be expanded to include more personalized content
    // based on user interests, groups, connections, etc.
    
    let html = '';
    
    try {
      // Example: Get recent popular posts (this is a placeholder)
      // In a real implementation, you would query the database for actual content
      html += `
        <div style="margin-bottom: 20px;">
          <h4 style="margin-bottom: 10px;">Popular Discussions</h4>
          <ul style="padding-left: 20px;">
            <li style="margin-bottom: 8px;">New opportunities in Software Development</li>
            <li style="margin-bottom: 8px;">Alumni meetup scheduled for next month</li>
            <li style="margin-bottom: 8px;">Tips for preparing for job interviews</li>
          </ul>
        </div>
      `;
      
      // Example: Suggest groups or connections
      html += `
        <div style="margin-bottom: 20px;">
          <h4 style="margin-bottom: 10px;">Connect with your community</h4>
          <p>There are new members from your branch looking to connect and collaborate on projects!</p>
        </div>
      `;
      
      // Example: Learning opportunities
      html += `
        <div style="margin-bottom: 20px;">
          <h4 style="margin-bottom: 10px;">Learning Opportunities</h4>
          <p>Several workshops and webinars are scheduled for the coming weeks that match your interests.</p>
        </div>
      `;
    } catch (error) {
      console.error("Error generating personalized content:", error);
      
      // Fallback content if there's an error
      html = `
        <div style="margin-bottom: 20px;">
          <p>There's been a lot of activity in the community lately! New discussions, opportunities, and connections await you.</p>
        </div>
      `;
    }
    
    return { html };
  }
}

export default InactiveUserService; 