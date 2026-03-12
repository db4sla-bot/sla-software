import { useState, useCallback, useEffect } from 'react';
import { DoorOpen, Plus, Download, X, Loader } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import '../CSS/MosquitoMeshDoors.css';

// Definition section component (outside main component to prevent recreation)
function DefinitionSection({ title, sectionKey, items, newValue, onInputChange, onAddItem, onDeleteItem }) {
  return (
    <div className="definition-section">
      <div className="section-header">
        <h3>{title}</h3>
      </div>
      
      <div className="section-add">
        <input
          type="text"
          placeholder={`Enter ${title.toLowerCase()}`}
          value={newValue}
          onChange={(e) => onInputChange(sectionKey, e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              onAddItem(sectionKey);
            }
          }}
          className="input"
        />
        <button 
          className="btn btn-primary btn-sm"
          onClick={() => onAddItem(sectionKey)}
        >
          <Plus size={16} /> Add
        </button>
      </div>

      <div className="section-list">
        {items.length === 0 ? (
          <p className="empty-message">No items added yet</p>
        ) : (
          <ul>
            {items.map((item, index) => (
              <li key={`${sectionKey}-${index}`} className="list-item">
                <span>{item}</span>
                <button 
                  className="btn-delete"
                  onClick={() => onDeleteItem(sectionKey, index)}
                  title="Delete"
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function MosquitoMeshDoors() {
  const [activeTab, setActiveTab] = useState('orders');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Definition sections state
  const [definitions, setDefinitions] = useState({
    productName: [],
    quality: [],
    series: [],
    doors: [],
    thickness: [],
    frameColor: [],
    meshColor: []
  });

  const [inputValues, setInputValues] = useState({
    productName: '',
    quality: '',
    series: '',
    doors: '',
    thickness: '',
    frameColor: '',
    meshColor: ''
  });

  // Load data from Firestore on component mount
  useEffect(() => {
    const loadDefinitions = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, 'mosquitoMeshDoors', 'definitions');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setDefinitions(docSnap.data());
        }
      } catch (error) {
        console.error('Error loading definitions:', error);
        alert('Error loading definitions from database');
      } finally {
        setLoading(false);
      }
    };

    loadDefinitions();
  }, []);

  // Save definitions to Firestore
  const saveToFirestore = async (updatedDefinitions) => {
    try {
      setSaving(true);
      const docRef = doc(db, 'mosquitoMeshDoors', 'definitions');
      await setDoc(docRef, updatedDefinitions, { merge: true });
      return true;
    } catch (error) {
      console.error('Error saving to Firestore:', error);
      alert('Error saving to database');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Add item to a section
  const handleAddItem = useCallback((section) => {
    const value = inputValues[section]?.trim();
    
    if (!value) {
      alert(`Please enter a ${section.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
      return;
    }

    // Check for duplicates
    if (definitions[section].includes(value)) {
      alert('This item already exists!');
      return;
    }

    const updatedDefinitions = {
      ...definitions,
      [section]: [...definitions[section], value]
    };

    setDefinitions(updatedDefinitions);

    setInputValues((prev) => ({
      ...prev,
      [section]: ''
    }));

    // Save to Firestore
    saveToFirestore(updatedDefinitions);
  }, [inputValues, definitions]);

  // Handle input change
  const handleInputChange = useCallback((section, value) => {
    setInputValues((prev) => ({
      ...prev,
      [section]: value
    }));
  }, []);

  // Delete item from a section
  const handleDeleteItem = useCallback((section, index) => {
    const updatedDefinitions = {
      ...definitions,
      [section]: definitions[section].filter((_, i) => i !== index)
    };

    setDefinitions(updatedDefinitions);

    // Save to Firestore
    saveToFirestore(updatedDefinitions);
  }, [definitions]);

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Mosquito Mesh Doors</h1>
          <p className="page-subtitle">Manage mosquito mesh door orders and installations</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline" disabled={saving}>
            <Download size={16} /> Export
          </button>
          {activeTab === 'orders' && (
            <button className="btn btn-primary" disabled={saving}>
              <Plus size={16} /> Add Order
            </button>
          )}
          {saving && (
            <div className="saving-indicator">
              <Loader size={16} className="spinner" />
              <span>Saving...</span>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <Loader size={40} className="spinner" />
          <p>Loading definitions...</p>
        </div>
      ) : (
        <>
          {/* Tab Navigation */}
          <div className="tabs-container">
        <div className="tabs-nav">
          <button 
            className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Orders
          </button>
          <button 
            className={`tab-btn ${activeTab === 'definitions' ? 'active' : ''}`}
            onClick={() => setActiveTab('definitions')}
          >
            Definitions
          </button>
        </div>

        {/* Tab Content */}
        <div className="tabs-content">
          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="tab-pane active">
              <div className="empty-state">
                <div className="empty-state-icon">
                  <DoorOpen size={36} />
                </div>
                <h3>No mosquito mesh door records</h3>
                <p>Add and manage your mosquito mesh door orders, installations, and tracking here.</p>
              </div>
            </div>
          )}

          {/* Definitions Tab */}
          {activeTab === 'definitions' && (
            <div className="tab-pane active">
              <div className="definitions-grid">
                <DefinitionSection 
                  title="Product Name" 
                  sectionKey="productName"
                  items={definitions.productName}
                  newValue={inputValues.productName}
                  onInputChange={handleInputChange}
                  onAddItem={handleAddItem}
                  onDeleteItem={handleDeleteItem}
                />
                <DefinitionSection 
                  title="Quality" 
                  sectionKey="quality"
                  items={definitions.quality}
                  newValue={inputValues.quality}
                  onInputChange={handleInputChange}
                  onAddItem={handleAddItem}
                  onDeleteItem={handleDeleteItem}
                />
                <DefinitionSection 
                  title="Series" 
                  sectionKey="series"
                  items={definitions.series}
                  newValue={inputValues.series}
                  onInputChange={handleInputChange}
                  onAddItem={handleAddItem}
                  onDeleteItem={handleDeleteItem}
                />
                <DefinitionSection 
                  title="Doors" 
                  sectionKey="doors"
                  items={definitions.doors}
                  newValue={inputValues.doors}
                  onInputChange={handleInputChange}
                  onAddItem={handleAddItem}
                  onDeleteItem={handleDeleteItem}
                />
                <DefinitionSection 
                  title="Thickness" 
                  sectionKey="thickness"
                  items={definitions.thickness}
                  newValue={inputValues.thickness}
                  onInputChange={handleInputChange}
                  onAddItem={handleAddItem}
                  onDeleteItem={handleDeleteItem}
                />
                <DefinitionSection 
                  title="Frame Color" 
                  sectionKey="frameColor"
                  items={definitions.frameColor}
                  newValue={inputValues.frameColor}
                  onInputChange={handleInputChange}
                  onAddItem={handleAddItem}
                  onDeleteItem={handleDeleteItem}
                />
                <DefinitionSection 
                  title="Mesh Color" 
                  sectionKey="meshColor"
                  items={definitions.meshColor}
                  newValue={inputValues.meshColor}
                  onInputChange={handleInputChange}
                  onAddItem={handleAddItem}
                  onDeleteItem={handleDeleteItem}
                />
              </div>
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
