import jwt from 'jsonwebtoken';

// Both failure paths return the identical message so an attacker cannot
// distinguish "missing token" from "invalid token" from "expired token".
const UNAUTHORIZED = {
  success: false,
  message: 'Not authorized to access this route'
};

export const protect = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json(UNAUTHORIZED);
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Only the id is stored. Controllers scope every query with req.userId
    // and avoid req.user, which would cost an extra DB lookup per request.
    req.userId = decoded.id;
    return next();
  } catch (err) {
    return res.status(401).json(UNAUTHORIZED);
  }
};

export default protect;
