import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { ItemEffectCSV, ItemXItemEffectCSV, MountCSV } from "../data/schema";

const findLatestVersionFile = (baseFileName: string): string => {
  const csvDir = path.join(__dirname, "..", "data", "csv");
  const files = fs.readdirSync(csvDir);
  const matchingFiles = files.filter(file => 
    file.toLowerCase().startsWith(baseFileName.toLowerCase()) && 
    file.endsWith('.csv')
  );

  if (matchingFiles.length === 0) {
    throw new Error(`No matching CSV file found for ${baseFileName}`);
  }

  return matchingFiles.sort().pop()!;
};

export const parseCSVFile = <T>(baseFileName: string): T[] => {
  const fileName = findLatestVersionFile(baseFileName);
  const filePath = path.join(__dirname, "..", "data", "csv", fileName);
  const fileContent = fs.readFileSync(filePath, "utf-8");

  return parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    cast: true,
  });
};

export const getMountData = (): MountCSV[] => {
  return parseCSVFile<MountCSV>("Mount");
};

export const getItemEffectData = (): ItemEffectCSV[] => {
  return parseCSVFile<ItemEffectCSV>("ItemEffect");
};

export const getItemXItemEffectData = (): ItemXItemEffectCSV[] => {
  return parseCSVFile<ItemXItemEffectCSV>("ItemXItemEffect");
};
