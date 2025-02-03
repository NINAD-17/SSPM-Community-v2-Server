import mongoose from 'mongoose';
import Group from '../models/group.model.js';
import { User } from '../models/user.model.js';
import { config } from 'dotenv';

config();

const testGroups = [
    {
        name: "JavaScript Developers",
        description: "A group for JavaScript enthusiasts",
        category: "JavaScript",
        skills: ["JavaScript", "Node.js", "React", "Vue"],
        isPrivate: false,
        visibility: "public"
    },
    {
        name: "Web Development",
        description: "Frontend and Backend development discussions",
        category: "Web Development",
        skills: ["HTML", "CSS", "JavaScript", "Bootstrap"],
        isPrivate: false,
        visibility: "public"
    },
    {
        name: "Python Programmers",
        description: "Python programming and frameworks",
        category: "Python",
        skills: ["Python", "Django", "Flask"],
        isPrivate: false,
        visibility: "public"
    },
    // Add more test groups as needed
];

async function addTestGroups() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Get an admin user
        const admin = await User.findOne();
        if (!admin) throw new Error("No user found to set as admin");

        // Add admin to each group
        const groupsWithAdmin = testGroups.map(group => ({
            ...group,
            admins: [admin._id],
            createdBy: admin._id
        }));

        // Clear existing groups
        await Group.deleteMany({});

        // Add new groups
        const result = await Group.insertMany(groupsWithAdmin);
        console.log(`Added ${result.length} test groups`);

    } catch (error) {
        console.error('Error adding test groups:', error);
    } finally {
        await mongoose.disconnect();
    }
}

addTestGroups(); 