import mongoose from 'mongoose'
const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  passwordHash: { type: String, required: true, select: false, match: /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/ },
  sessionVersion: { type: Number, default: 0, required: true, min: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true, bufferTimeoutMS: 5000 })
adminSchema.set('toJSON', { transform(_doc, value) { delete value.passwordHash; delete value.sessionVersion; return value } })
export default mongoose.model('Admin', adminSchema)
