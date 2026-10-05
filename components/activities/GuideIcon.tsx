"use client";

import {
  Hand, Grab, Scissors, Droplets, Paintbrush, Pencil, FileText, BookOpen,
  Circle, Blocks, Puzzle, Box, Music, PartyPopper, PersonStanding, ArrowUp,
  Scale, Move, Wind, Smile, Eye, Ear, MessageCircle, Fingerprint, Flower2,
  Candy, GlassWater, Waves, Cookie, ChefHat, Utensils, Shirt, Footprints, Smile as Tooth,
  Bath, Moon, Home, Armchair, Table, Clock, Repeat, HeartHandshake,
  Trophy, Star, Heart, Sun, Camera, type LucideIcon,
} from "lucide-react";

/** Cada clave del catálogo de lib/activityGuide.ts tiene aquí su dibujo */
const ICONS: Record<string, LucideIcon> = {
  mano: Hand, pinza: Grab, tijeras: Scissors, pegamento: Droplets,
  pincel: Paintbrush, lapiz: Pencil, papel: FileText, libro: BookOpen,
  pelota: Circle, bloques: Blocks, puzzle: Puzzle, cubo: Box,
  musica: Music, baile: PartyPopper, correr: PersonStanding, saltar: ArrowUp,
  equilibrio: Scale, estirar: Move, respirar: Wind, calma: Smile,
  mirar: Eye, escuchar: Ear, hablar: MessageCircle, tocar: Fingerprint,
  oler: Flower2, gustar: Candy, agua: GlassWater, arena: Waves,
  plastilina: Cookie, cocina: ChefHat, comer: Utensils, vestirse: Shirt,
  zapatos: Footprints, dientes: Tooth, bano: Bath, dormir: Moon,
  casa: Home, silla: Armchair, mesa: Table, reloj: Clock,
  turno: Repeat, ayuda: HeartHandshake, celebrar: Trophy, estrella: Star,
  corazon: Heart, sol: Sun, foto: Camera,
};

export default function GuideIcon({ name, className = "w-9 h-9" }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Star;
  return <Icon className={className} strokeWidth={1.75} />;
}
