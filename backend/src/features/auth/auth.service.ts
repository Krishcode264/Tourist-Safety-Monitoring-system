import { prisma } from '../../shared/db/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_123';
const JWT_EXPIRES_IN = '24h';

export class AuthService {
    async login(username: string, passwordString: string) {
        const user = await prisma.user.findUnique({
            where: { username },
            include: {
                role: true,
                region: { select: { id: true, name: true } }
            }
        });

        if (!user) {
            throw new Error('Invalid username or password');
        }

        const isPasswordValid = await bcrypt.compare(passwordString, user.password);
        
        if (!isPasswordValid) {
            throw new Error('Invalid username or password');
        }

        // Create JWT payload
        const payload = {
            id: user.id,
            username: user.username,
            roleId: user.roleId,
            role: user.role.name, // Normalized role field
            roleName: user.role.name,
            regionId: user.regionId
        };


        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        // Update online status
        await prisma.user.update({
            where: { id: user.id },
            data: { isOnline: true }
        });

        // Omit the password hash
        const { password, ...userWithoutPassword } = user;

        return {
            user: {
                ...userWithoutPassword,
                roleName: user.role.name,
                regionName: user.region?.name || null
            },
            token
        };
    }

    async touristSignup(data: { 
        email: string, 
        passwordString: string, 
        fullName: string, 
        phoneNumber: string, 
        nationality: string,
        tripDuration?: string,
        citiesExploring?: string
    }) {
        const hashedPassword = await bcrypt.hash(data.passwordString, 10);
        
        let tourist;
        try {
            tourist = await prisma.tourist.create({
                data: {
                    email: data.email,
                    password: hashedPassword,
                    fullName: data.fullName,
                    phoneNumber: data.phoneNumber,
                    nationality: data.nationality,
                    tripDuration: data.tripDuration ? parseInt(data.tripDuration) : undefined,
                    citiesExploring: data.citiesExploring
                }
            });
        } catch (error: any) {
            if (error.code === 'P2002') {
                const target = error.meta?.target;
                if (Array.isArray(target) && target.includes('phoneNumber')) {
                    throw new Error('This phone number is already registered. Please log in or use another number.');
                }
                if (Array.isArray(target) && target.includes('email')) {
                    throw new Error('This email is already registered. Please log in or use another email.');
                }
                throw new Error('An account with this email or phone number already exists.');
            }
            throw error;
        }

        const token = jwt.sign({ 
            id: tourist.id, 
            email: (tourist as any).email, 
            role: 'tourist',
            fullName: data.fullName
        }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });


        // Omit password hash
        const { password, ...touristWithoutPassword } = tourist as any;

        return { tourist: touristWithoutPassword, token };
    }

    async touristLogin(email: string, passwordString: string) {
        const tourist = await prisma.tourist.findUnique({
            where: { email }
        });

        if (!tourist) {
            throw new Error('Invalid email or password');
        }

        const isPasswordValid = await bcrypt.compare(passwordString, (tourist as any).password);
        
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }

        const token = jwt.sign({ 
            id: tourist.id, 
            email: (tourist as any).email, 
            role: 'tourist',
            fullName: (tourist as any).fullName
        }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });


        // Omit password hash
        const { password, ...touristWithoutPassword } = tourist as any;

        return {
            user: {
                ...touristWithoutPassword,
                role: 'tourist'
            },
            token
        };
    }

    async guestLogin() {
        // Find Savita by full name
        const user = await prisma.user.findFirst({
            where: {
                fullName: {
                    contains: 'Savita',
                    mode: 'insensitive'
                }
            },
            include: {
                role: true,
                region: { select: { id: true, name: true } }
            }
        });

        if (!user) {
            throw new Error('Guest user (Savita) not found in database');
        }

        // Create JWT payload
        const payload = {
            id: user.id,
            username: user.username,
            roleId: user.roleId,
            role: user.role.name,
            roleName: user.role.name,
            regionId: user.regionId
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        // Update online status
        await prisma.user.update({
            where: { id: user.id },
            data: { isOnline: true }
        });

        // Omit the password hash
        const { password, ...userWithoutPassword } = user;

        return {
            user: {
                ...userWithoutPassword,
                roleName: user.role.name,
                regionName: user.region?.name || null
            },
            token
        };
    }
}
