import { z } from "zod";

export const agendamentoSchema = z.object({
  tipo_aula: z.enum(['iniciante', 'intermediario', 'avancado', 'wing_foil'], {
    errorMap: () => ({ message: "Selecione um tipo de aula" })
  }),
  localizacao: z.enum(['florianopolis', 'taiba'], {
    errorMap: () => ({ message: "Selecione uma localização" })
  }),
  data: z.date({
    required_error: "Selecione uma data",
    invalid_type_error: "Data inválida",
  }).refine((date) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return date >= hoje;
  }, {
    message: "Data deve ser hoje ou futura",
  }),
  horario: z.enum(['08:00', '10:00', '14:00', '16:00'], {
    errorMap: () => ({ message: "Selecione um horário" })
  }),
  nome: z.string()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(100, "Nome muito longo")
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Nome deve conter apenas letras"),
  email: z.string()
    .email("Email inválido")
    .toLowerCase(),
  whatsapp: z.string()
    .regex(/^\d{11}$/, "WhatsApp deve ter 11 dígitos (DDD + número)")
    .refine((val) => {
      const ddd = val.substring(0, 2);
      return ['11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '24', '27', '28', 
              '31', '32', '33', '34', '35', '37', '38', '41', '42', '43', '44', '45', '46', '47', 
              '48', '49', '51', '53', '54', '55', '61', '62', '63', '64', '65', '66', '67', '68', 
              '69', '71', '73', '74', '75', '77', '79', '81', '82', '83', '84', '85', '86', '87', 
              '88', '89', '91', '92', '93', '94', '95', '96', '97', '98', '99'].includes(ddd);
    }, {
      message: "DDD inválido"
    }),
  experiencia: z.enum(['nunca', 'poucas_vezes', 'experiente'], {
    errorMap: () => ({ message: "Selecione sua experiência" })
  }),
});

export type AgendamentoFormData = z.infer<typeof agendamentoSchema>;
