import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@shared/layout/AdminLayout/AdminLayout';
import { Icon } from '@shared/ui/Icon/Icon';
import { Input } from '@shared/ui/Input/Input';
import { Button } from '@shared/ui/Button/Button';
import { MediaUpload } from '@shared/ui/MediaUpload';
import styles from './AdminEventCreate.module.css';

// ── Types ──
interface BasicInfoStep {
  title: string;
  description: string;
  category: string;
  tags: string;
}

interface VenueStep {
  name: string;
  address: string;
  city: string;
  state: string;
  capacity: string;
}

interface DatesStep {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  doorsOpenTime: string;
}

interface TicketBatch {
  id: string;
  name: string;
  price: string;
  quantity: string;
  type: 'regular' | 'vip' | 'early-bird';
}

interface MediaStep {
  coverImage: File | null;
  gallery: File[];
}

// ── Step 1: Basic Info ──
const BasicInfoStepComponent: React.FC<{
  data: BasicInfoStep;
  onChange: (data: BasicInfoStep) => void;
}> = ({ data, onChange }) => (
  <div className={styles.stepContent}>
    <h3 className={styles.stepTitle}>Informacoes basicas</h3>
    <p className={styles.stepDescription}>
      Defina o titulo, descricao, categoria e tags do seu evento
    </p>

    <div className={styles.formGroup}>
      <Input
        label="Titulo do evento"
        placeholder="ex: Festival de Musica 2024"
        value={data.title}
        onChange={(e) => onChange({ ...data, title: e.target.value })}
        required
        fullWidth
      />
    </div>

    <div className={styles.formGroup}>
      <label className={styles.label}>Descricao</label>
      <textarea
        className={styles.textarea}
        placeholder="Descreva seu evento em detalhes..."
        value={data.description}
        onChange={(e) => onChange({ ...data, description: e.target.value })}
        rows={5}
        required
      />
    </div>

    <div className={styles.formRow}>
      <div className={styles.formGroup}>
        <Input
          label="Categoria"
          placeholder="ex: Musica, Teatro, Esportes"
          value={data.category}
          onChange={(e) => onChange({ ...data, category: e.target.value })}
          required
          fullWidth
        />
      </div>

      <div className={styles.formGroup}>
        <Input
          label="Tags (separadas por virgula)"
          placeholder="ex: ao-vivo, indoor, family-friendly"
          value={data.tags}
          onChange={(e) => onChange({ ...data, tags: e.target.value })}
          fullWidth
        />
      </div>
    </div>
  </div>
);

// ── Step 2: Venue ──
const VenueStepComponent: React.FC<{
  data: VenueStep;
  onChange: (data: VenueStep) => void;
}> = ({ data, onChange }) => (
  <div className={styles.stepContent}>
    <h3 className={styles.stepTitle}>Local do evento</h3>
    <p className={styles.stepDescription}>Informe os dados do local onde o evento sera realizado</p>

    <div className={styles.formGroup}>
      <Input
        label="Nome do local"
        placeholder="ex: Estadio do Morumbi"
        value={data.name}
        onChange={(e) => onChange({ ...data, name: e.target.value })}
        required
        fullWidth
      />
    </div>

    <div className={styles.formGroup}>
      <Input
        label="Endereco"
        placeholder="ex: Av. Morumbi, 123"
        value={data.address}
        onChange={(e) => onChange({ ...data, address: e.target.value })}
        required
        fullWidth
      />
    </div>

    <div className={styles.formRow}>
      <div className={styles.formGroup}>
        <Input
          label="Cidade"
          placeholder="ex: Sao Paulo"
          value={data.city}
          onChange={(e) => onChange({ ...data, city: e.target.value })}
          required
          fullWidth
        />
      </div>

      <div className={styles.formGroup}>
        <Input
          label="Estado"
          placeholder="ex: SP"
          value={data.state}
          onChange={(e) => onChange({ ...data, state: e.target.value.toUpperCase() })}
          required
          fullWidth
          maxLength={2}
        />
      </div>

      <div className={styles.formGroup}>
        <Input
          label="Capacidade"
          type="number"
          placeholder="ex: 5000"
          value={data.capacity}
          onChange={(e) => onChange({ ...data, capacity: e.target.value })}
          required
          fullWidth
        />
      </div>
    </div>
  </div>
);

// ── Step 3: Dates ──
const DatesStepComponent: React.FC<{
  data: DatesStep;
  onChange: (data: DatesStep) => void;
}> = ({ data, onChange }) => (
  <div className={styles.stepContent}>
    <h3 className={styles.stepTitle}>Datas e horarios</h3>
    <p className={styles.stepDescription}>Configure as datas e horarios do seu evento</p>

    <div className={styles.formRow}>
      <div className={styles.formGroup}>
        <Input
          label="Data de inicio"
          type="date"
          value={data.startDate}
          onChange={(e) => onChange({ ...data, startDate: e.target.value })}
          required
          fullWidth
        />
      </div>

      <div className={styles.formGroup}>
        <Input
          label="Horario de inicio"
          type="time"
          value={data.startTime}
          onChange={(e) => onChange({ ...data, startTime: e.target.value })}
          required
          fullWidth
        />
      </div>
    </div>

    <div className={styles.formRow}>
      <div className={styles.formGroup}>
        <Input
          label="Data de termino"
          type="date"
          value={data.endDate}
          onChange={(e) => onChange({ ...data, endDate: e.target.value })}
          required
          fullWidth
        />
      </div>

      <div className={styles.formGroup}>
        <Input
          label="Horario de termino"
          type="time"
          value={data.endTime}
          onChange={(e) => onChange({ ...data, endTime: e.target.value })}
          required
          fullWidth
        />
      </div>
    </div>

    <div className={styles.formGroup}>
      <Input
        label="Horario de abertura das portas"
        type="time"
        value={data.doorsOpenTime}
        onChange={(e) => onChange({ ...data, doorsOpenTime: e.target.value })}
        fullWidth
      />
    </div>
  </div>
);

// ── Step 4: Batches ──
const BatchesStepComponent: React.FC<{
  batches: TicketBatch[];
  onChange: (batches: TicketBatch[]) => void;
}> = ({ batches, onChange }) => {
  const addBatch = () => {
    const newBatch: TicketBatch = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      price: '',
      quantity: '',
      type: 'regular',
    };
    onChange([...batches, newBatch]);
  };

  const removeBatch = (id: string) => {
    onChange(batches.filter((b) => b.id !== id));
  };

  const updateBatch = (id: string, updates: Partial<TicketBatch>) => {
    onChange(batches.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  return (
    <div className={styles.stepContent}>
      <h3 className={styles.stepTitle}>Lotes de ingressos</h3>
      <p className={styles.stepDescription}>
        Crie diferentes lotes de ingressos com precos e quantidades diferentes
      </p>

      <div className={styles.batchesList}>
        {batches.length === 0 ? (
          <p className={styles.emptyMessage}>Nenhum lote criado ainda</p>
        ) : (
          batches.map((batch, idx) => (
            <div key={batch.id} className={styles.batchCard}>
              <div className={styles.batchHeader}>
                <span className={styles.batchNumber}>Lote {idx + 1}</span>
                <button
                  type="button"
                  className={styles.removeBatchButton}
                  onClick={() => removeBatch(batch.id)}
                  title="Remover lote"
                  aria-label="Remover lote"
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>

              <div className={styles.batchGrid}>
                <Input
                  label="Nome do lote"
                  placeholder="ex: Early Bird"
                  value={batch.name}
                  onChange={(e) => updateBatch(batch.id, { name: e.target.value })}
                  fullWidth
                />

                <div>
                  <label className={styles.label}>Tipo</label>
                  <select
                    className={styles.select}
                    value={batch.type}
                    onChange={(e) =>
                      updateBatch(batch.id, { type: e.target.value as TicketBatch['type'] })
                    }
                  >
                    <option value="regular">Regular</option>
                    <option value="vip">VIP</option>
                    <option value="early-bird">Early Bird</option>
                  </select>
                </div>

                <Input
                  label="Preco (R$)"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={batch.price}
                  onChange={(e) => updateBatch(batch.id, { price: e.target.value })}
                  fullWidth
                />

                <Input
                  label="Quantidade"
                  type="number"
                  placeholder="0"
                  value={batch.quantity}
                  onChange={(e) => updateBatch(batch.id, { quantity: e.target.value })}
                  fullWidth
                />
              </div>
            </div>
          ))
        )}
      </div>

      <Button
        type="button"
        variant="secondary"
        fullWidth
        onClick={addBatch}
        className={styles.addBatchButton}
      >
        <Icon name="plus" size={16} />
        Adicionar lote
      </Button>
    </div>
  );
};

// ── Step 5: Media ──
const MediaStepComponent: React.FC<{
  data: MediaStep;
  onChange: (data: MediaStep) => void;
}> = ({ data, onChange }) => (
  <div className={styles.stepContent}>
    <h3 className={styles.stepTitle}>Midia do evento</h3>
    <p className={styles.stepDescription}>
      Faca upload da imagem de capa e galeria de fotos do evento
    </p>

    <div className={styles.formGroup}>
      <label className={styles.label}>Imagem de capa (obrigatoria)</label>
      <div className={styles.coverImageUpload}>
        {data.coverImage ? (
          <div className={styles.coverImagePreview}>
            <img
              src={URL.createObjectURL(data.coverImage)}
              alt="Capa do evento"
              className={styles.coverImage}
            />
            <button
              type="button"
              className={styles.removeCoverButton}
              onClick={() => onChange({ ...data, coverImage: null })}
              aria-label="Remover imagem de capa"
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
        ) : (
          <label className={styles.coverImageUploadLabel}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onChange({ ...data, coverImage: file });
                }
              }}
              className={styles.hiddenInput}
            />
            <Icon name="download" size={32} />
            <span>Selecione a imagem de capa</span>
          </label>
        )}
      </div>
    </div>

    <div className={styles.formGroup}>
      <label className={styles.label}>Galeria de fotos (opcional)</label>
      <MediaUpload
        onFilesChange={(files) => onChange({ ...data, gallery: files })}
        maxFiles={10}
        maxSizeMB={5}
        accept="image/jpeg,image/png,image/webp,image/gif"
      />
    </div>
  </div>
);

// ── Step 6: Review ──
const ReviewStepComponent: React.FC<{
  basicInfo: BasicInfoStep;
  venue: VenueStep;
  dates: DatesStep;
  batches: TicketBatch[];
  media: MediaStep;
}> = ({ basicInfo, venue, dates, batches, media }) => (
  <div className={styles.stepContent}>
    <h3 className={styles.stepTitle}>Revisar e publicar</h3>
    <p className={styles.stepDescription}>
      Revise todos os dados do seu evento antes de publicar
    </p>

    <div className={styles.reviewGrid}>
      <div className={styles.reviewCard}>
        <h4 className={styles.reviewTitle}>Informacoes basicas</h4>
        <div className={styles.reviewItem}>
          <span className={styles.reviewLabel}>Titulo:</span>
          <span className={styles.reviewValue}>{basicInfo.title}</span>
        </div>
        <div className={styles.reviewItem}>
          <span className={styles.reviewLabel}>Categoria:</span>
          <span className={styles.reviewValue}>{basicInfo.category}</span>
        </div>
        <div className={styles.reviewItem}>
          <span className={styles.reviewLabel}>Tags:</span>
          <span className={styles.reviewValue}>{basicInfo.tags || '-'}</span>
        </div>
      </div>

      <div className={styles.reviewCard}>
        <h4 className={styles.reviewTitle}>Local</h4>
        <div className={styles.reviewItem}>
          <span className={styles.reviewLabel}>Nome:</span>
          <span className={styles.reviewValue}>{venue.name}</span>
        </div>
        <div className={styles.reviewItem}>
          <span className={styles.reviewLabel}>Endereco:</span>
          <span className={styles.reviewValue}>{venue.address}</span>
        </div>
        <div className={styles.reviewItem}>
          <span className={styles.reviewLabel}>Cidade:</span>
          <span className={styles.reviewValue}>
            {venue.city}, {venue.state}
          </span>
        </div>
        <div className={styles.reviewItem}>
          <span className={styles.reviewLabel}>Capacidade:</span>
          <span className={styles.reviewValue}>{venue.capacity} pessoas</span>
        </div>
      </div>

      <div className={styles.reviewCard}>
        <h4 className={styles.reviewTitle}>Data e hora</h4>
        <div className={styles.reviewItem}>
          <span className={styles.reviewLabel}>Inicio:</span>
          <span className={styles.reviewValue}>
            {dates.startDate} as {dates.startTime}
          </span>
        </div>
        <div className={styles.reviewItem}>
          <span className={styles.reviewLabel}>Termino:</span>
          <span className={styles.reviewValue}>
            {dates.endDate} as {dates.endTime}
          </span>
        </div>
        <div className={styles.reviewItem}>
          <span className={styles.reviewLabel}>Portas abrem:</span>
          <span className={styles.reviewValue}>{dates.doorsOpenTime || '-'}</span>
        </div>
      </div>

      <div className={styles.reviewCard}>
        <h4 className={styles.reviewTitle}>Lotes de ingressos ({batches.length})</h4>
        {batches.map((batch) => (
          <div key={batch.id} className={styles.reviewItem}>
            <span className={styles.reviewLabel}>{batch.name || 'Lote sem nome'}:</span>
            <span className={styles.reviewValue}>
              R$ {parseFloat(batch.price || '0').toFixed(2)} x {batch.quantity} ingressos
            </span>
          </div>
        ))}
      </div>

      <div className={styles.reviewCard}>
        <h4 className={styles.reviewTitle}>Midia</h4>
        <div className={styles.reviewItem}>
          <span className={styles.reviewLabel}>Imagem de capa:</span>
          <span className={styles.reviewValue}>
            {media.coverImage ? `${media.coverImage.name}` : 'Nao adicionada'}
          </span>
        </div>
        <div className={styles.reviewItem}>
          <span className={styles.reviewLabel}>Fotos na galeria:</span>
          <span className={styles.reviewValue}>{media.gallery.length} fotos</span>
        </div>
      </div>
    </div>
  </div>
);

// ── Main Component ──
const AdminEventCreate: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [basicInfo, setBasicInfo] = useState<BasicInfoStep>({
    title: '',
    description: '',
    category: '',
    tags: '',
  });

  const [venue, setVenue] = useState<VenueStep>({
    name: '',
    address: '',
    city: '',
    state: '',
    capacity: '',
  });

  const [dates, setDates] = useState<DatesStep>({
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    doorsOpenTime: '',
  });

  const [batches, setBatches] = useState<TicketBatch[]>([]);

  const [media, setMedia] = useState<MediaStep>({
    coverImage: null,
    gallery: [],
  });

  const totalSteps = 6;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePublish = async () => {
    setIsLoading(true);
    try {
      // TODO: Call API to create event
      console.log({
        basicInfo,
        venue,
        dates,
        batches,
        media,
      });
      // After successful creation:
      navigate('/admin/events');
    } catch (error) {
      console.error('Erro ao criar evento:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isStepValid = (): boolean => {
    switch (currentStep) {
      case 1:
        return basicInfo.title.trim() !== '' && basicInfo.description.trim() !== '';
      case 2:
        return (
          venue.name.trim() !== '' &&
          venue.address.trim() !== '' &&
          venue.city.trim() !== '' &&
          venue.state.trim() !== '' &&
          venue.capacity.trim() !== ''
        );
      case 3:
        return (
          dates.startDate !== '' &&
          dates.startTime !== '' &&
          dates.endDate !== '' &&
          dates.endTime !== ''
        );
      case 4:
        return batches.length > 0;
      case 5:
        return media.coverImage !== null;
      case 6:
        return true;
      default:
        return false;
    }
  };

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Criar novo evento</h1>
            <p className={styles.pageSubtitle}>Passo {currentStep} de {totalSteps}</p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
          <div className={styles.stepsIndicator}>
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
              <div
                key={step}
                className={`${styles.stepIndicator} ${
                  step === currentStep ? styles.active : ''
                } ${step < currentStep ? styles.completed : ''}`}
                onClick={() => step < currentStep && setCurrentStep(step)}
              >
                {step < currentStep ? (
                  <Icon name="check" size={16} />
                ) : (
                  <span>{step}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Wizard Card */}
        <div className={styles.card}>
          {/* Step Content */}
          <div className={styles.stepContainer}>
            {currentStep === 1 && (
              <BasicInfoStepComponent data={basicInfo} onChange={setBasicInfo} />
            )}
            {currentStep === 2 && (
              <VenueStepComponent data={venue} onChange={setVenue} />
            )}
            {currentStep === 3 && (
              <DatesStepComponent data={dates} onChange={setDates} />
            )}
            {currentStep === 4 && (
              <BatchesStepComponent batches={batches} onChange={setBatches} />
            )}
            {currentStep === 5 && (
              <MediaStepComponent data={media} onChange={setMedia} />
            )}
            {currentStep === 6 && (
              <ReviewStepComponent
                basicInfo={basicInfo}
                venue={venue}
                dates={dates}
                batches={batches}
                media={media}
              />
            )}
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <Button
              variant="secondary"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <Icon name="chevron-left" size={16} />
              Voltar
            </Button>

            {currentStep === totalSteps ? (
              <Button
                variant="primary"
                onClick={handlePublish}
                loading={isLoading}
                disabled={!isStepValid()}
              >
                <Icon name="check" size={16} />
                Publicar evento
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={!isStepValid()}
              >
                Proximo
                <Icon name="chevron-right" size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminEventCreate;
