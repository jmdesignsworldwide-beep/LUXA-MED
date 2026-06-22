-- =============================================================================
-- 0010  DATOS DE PRUEBA (DEMO) — pacientes dominicanos realistas
-- =============================================================================
-- ⚠️ SOLO PARA PRUEBAS/PREVIEW. Borrar antes de producción:
--      delete from public.pacientes where cedula in (... estas cédulas ...);
-- Idempotente: ON CONFLICT por cédula no duplica.
-- created_by = null (aún no hay usuarios reales asignados).
-- =============================================================================

insert into public.pacientes
  (nombre_completo, cedula, fecha_nacimiento, sexo, telefono, email, direccion,
   tipo_sangre, alergias, contacto_emergencia_nombre, contacto_emergencia_telefono,
   ars, ars_numero_afiliado, activo)
values
  ('María Altagracia Fernández', '001-1234567-8', '1985-03-12', 'F', '809-555-0142', 'maria.fernandez@correo.do', 'C/ Duarte 45, Santiago', 'O+', 'Penicilina', 'José Fernández', '809-555-0143', 'SeNaSa', 'SNS-001245', true),
  ('Juan Carlos Peña Rosario', '402-1122334-5', '1979-11-02', 'M', '829-555-0188', 'jc.pena@correo.do', 'Av. 27 de Febrero 120, Santo Domingo', 'A+', 'Ninguna', 'Ana Rosario', '829-555-0189', 'ARS Humano', 'HUM-77820', true),
  ('Rosa Mercedes Jiménez', '031-0456789-1', '1992-07-25', 'F', '849-555-0210', 'rosa.jimenez@correo.do', 'C/ El Sol 88, La Vega', 'B+', 'Sulfas', 'Pedro Jiménez', '849-555-0211', 'ARS Universal', 'UNI-33019', true),
  ('Pedro Antonio Reyes', '001-0987654-3', '1968-01-30', 'M', '809-555-0233', 'pedro.reyes@correo.do', 'C/ Mella 12, San Pedro de Macorís', 'O-', 'Mariscos', 'Luisa Reyes', '809-555-0234', 'Mapfre Salud', 'MAP-50127', true),
  ('Ana Lucía Martínez', '223-0011223-4', '2001-09-18', 'F', '829-555-0277', 'ana.martinez@correo.do', 'Av. Estrella Sadhalá 5, Santiago', 'AB+', 'Ninguna', 'Carmen Martínez', '829-555-0278', 'SeNaSa', 'SNS-009912', true),
  ('Luis Manuel Santana', '402-7654321-0', '1974-05-08', 'M', '809-555-0301', 'luis.santana@correo.do', 'C/ Las Flores 23, Higüey', 'A-', 'Aspirina', 'Marta Santana', '809-555-0302', 'ARS Palic', 'PAL-44021', true),
  ('Carmen Yokasta De Los Santos', '037-0123456-7', '1989-12-14', 'F', '849-555-0345', 'carmen.delossantos@correo.do', 'C/ Sánchez 9, Puerto Plata', 'B-', 'Látex', 'Rafael De Los Santos', '849-555-0346', 'ARS APS', 'APS-12233', true),
  ('Francisco Javier Núñez', '001-5566778-9', '1995-02-27', 'M', '809-555-0388', 'francisco.nunez@correo.do', 'Av. Independencia 200, Santo Domingo', 'O+', 'Ninguna', 'Sofía Núñez', '809-555-0389', 'ARS Humano', 'HUM-66104', true),
  ('Yamilet Esperanza Cruz', '054-0099887-6', '1983-08-03', 'F', '829-555-0412', 'yamilet.cruz@correo.do', 'C/ Restauración 77, Moca', 'AB-', 'Yodo', 'Andrés Cruz', '829-555-0413', 'ARS Universal', 'UNI-88450', false),
  ('Ramón Emilio Guzmán', '012-0334455-2', '1961-06-21', 'M', '809-555-0455', 'ramon.guzman@correo.do', 'C/ Libertad 3, Barahona', 'A+', 'Penicilina', 'Teresa Guzmán', '809-555-0456', 'SeNaSa', 'SNS-014477', false),
  ('Wendy Carolina Ramírez', '402-3344556-7', '1998-04-11', 'F', '849-555-0490', 'wendy.ramirez@correo.do', 'Av. Winston Churchill 15, Santo Domingo', 'O+', 'Ninguna', 'Gabriel Ramírez', '849-555-0491', 'Mapfre Salud', 'MAP-77310', true),
  ('José Miguel Castillo', '001-7788990-1', '1972-10-09', 'M', '809-555-0521', 'jose.castillo@correo.do', 'C/ Padre Billini 60, Santo Domingo', 'B+', 'Ibuprofeno', 'Dolores Castillo', '809-555-0522', 'ARS Reservas', 'RES-20098', true)
on conflict (cedula) where cedula is not null do nothing;
