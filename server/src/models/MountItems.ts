import mongoose from 'mongoose';

const mountItemsSchema = new mongoose.Schema({
  mountid: Number,
  name: String,
  spellid: Number,
  itemid: Number,
  buildversion: String,
  lastupdated: Date
});

export default mongoose.model('MountItems', mountItemsSchema);
